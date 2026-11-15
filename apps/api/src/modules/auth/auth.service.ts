import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { MailerService } from '../../common/mailer/mailer.service.js';
import type { Env } from '../../config/env.schema.js';
import type { RegisterInput, LoginInput } from '@sokoos/shared';

const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 15;
const MAX_MFA_ATTEMPTS = 5;
const MAX_VERIFICATION_ATTEMPTS = 5;
const VERIFICATION_CODE_TTL_MINUTES = 10;
const PASSWORD_RESET_TTL_MINUTES = 30;
const INVITATION_TTL_DAYS = 7;

// A real argon2id hash with the same cost parameters as `argon2.hash` defaults, used to
// equalise response time for unknown emails. It must be a well-formed digest: a malformed
// one makes verify() throw instead of returning false, which turns the enumeration guard
// into an enumeration oracle (unknown email 500, known email 401).
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$Zuilu/5+9TLUoeufpNKzUg$9588jZsS/R1BGgaZrsoY10wCmrPhsjhWHE7L4G7yKDY';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private mfaKey?: Buffer;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService<Env>,
    private audit: AuditService,
    private mailer: MailerService,
  ) {}

  // ── Register ─────────────────────────────────────────────────────────────
  async register(input: RegisterInput) {
    // Check duplicates
    const existingEmail = await this.prisma.user.findFirst({ where: { email: input.email } });
    if (existingEmail) throw new ConflictException({ code: 'DUPLICATE_EMAIL', message: 'An account with this email already exists' });

    if (input.phone) {
      const existingPhone = await this.prisma.user.findFirst({ where: { phone: input.phone } });
      if (existingPhone) throw new ConflictException({ code: 'DUPLICATE_PHONE', message: 'An account with this phone already exists' });
    }

    const passwordHash = await argon2.hash(input.password);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        fullName: input.fullName,
        passwordHash,
        status: 'PENDING_VERIFICATION',
      },
      select: { id: true, email: true, fullName: true, status: true },
    });

    // Create phone verification token
    const code = await this.createVerificationToken(user.id, 'PHONE_VERIFICATION');
    // Real delivery: the code goes to the user's email (fail-soft — see MailerService).
    await this.mailer.sendVerificationCode(user.email, code, 'account verification');

    this.logger.log(`User registered: ${user.id}`);
    return {
      userId: user.id,
      message: 'Verification code sent to your email',
    };
  }

  // ── Verify by email + code (public, used right after registration) ───────
  async verifyByEmail(email: string, code: string) {
    const user = await this.prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    if (!user) throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'Invalid or expired verification code' });
    return this.verifyPhone(user.id, code);
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    if (!user || user.status !== 'PENDING_VERIFICATION') {
      return { message: 'If the account needs verification, a new code has been sent.' };
    }
    const code = await this.createVerificationToken(user.id, 'PHONE_VERIFICATION');
    await this.mailer.sendVerificationCode(user.email, code, 'account verification');
    return {
      message: 'If the account needs verification, a new code has been sent.',
    };
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({ where: { email: input.email } });

    if (!user) {
      // Constant-time response to prevent user enumeration
      await argon2.verify(DUMMY_PASSWORD_HASH, input.password);
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Email or password is wrong' });
    }

    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new ForbiddenException({ code: 'ACCOUNT_SUSPENDED', message: 'This account is not active. Contact your administrator.' });
    }
    if (user.status === 'PENDING_VERIFICATION') {
      throw new ForbiddenException({ code: 'ACCOUNT_NOT_VERIFIED', message: 'Verify your account with the code we sent before signing in' });
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const secondsLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      throw new ForbiddenException({ code: 'ACCOUNT_LOCKED', message: `Account locked. Try again in ${secondsLeft}s`, retryAfter: secondsLeft });
    }

    // Verify password
    const valid = await argon2.verify(user.passwordHash, input.password);
    if (!valid) {
      const attempts = user.failedLoginCount + 1;
      const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
        },
      });
      const remaining = MAX_LOGIN_ATTEMPTS - attempts;
      await this.audit.logAuthEvent(user.id, 'auth.login.failed',
        { attempts, ...(shouldLock && { locked: true, lockMinutes: LOCKOUT_MINUTES }) },
        { ipAddress, userAgent });
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: remaining > 0
          ? `Email or password is wrong. ${remaining} attempts left before a ${LOCKOUT_MINUTES}-minute lock.`
          : 'Account locked for 15 minutes',
      });
    }

    // Reset failed attempts
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    // MFA check
    if (user.mfaEnabled) {
      const challengeToken = crypto.randomUUID();
      await this.prisma.authToken.create({
        data: {
          userId: user.id,
          tokenType: 'EMAIL_VERIFICATION', // repurposed as MFA challenge token
          tokenHash: await argon2.hash(challengeToken),
          expiresAt: new Date(Date.now() + 10 * 60_000),
        },
      });
      return { requiresMfa: true, challengeToken };
    }

    const session = await this.createSession(user.id, ipAddress, userAgent, input.rememberMe);
    await this.audit.logAuthEvent(user.id, 'auth.login.success', {}, { ipAddress, userAgent });
    return { ...session, ...(await this.sessionContext(user.id)) };
  }

  private async sessionContext(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, fullName: true, email: true },
    });
    const role = await this.prisma.userRole.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!role) return { user };
    const business = await this.prisma.business.findFirst({ where: { id: role.businessId, deletedAt: null } });
    const branch = business
      ? await this.prisma.branch.findFirst({ where: { businessId: business.id }, orderBy: { createdAt: 'asc' } })
      : null;
    return {
      user,
      ...(business && { business: { id: business.id, name: business.legalName, type: business.businessType } }),
      ...(branch && { branch: { id: branch.id } }),
    };
  }

  // ── MFA verification ──────────────────────────────────────────────────────
  async verifyMfa(challengeToken: string, code: string) {
    // Find the challenge token. Limit attempts so a 6-digit code cannot be brute-forced.
    const tokens = await this.prisma.authToken.findMany({
      where: {
        tokenType: 'EMAIL_VERIFICATION',
        consumedAt: null,
        expiresAt: { gt: new Date() },
        attemptCount: { lt: MAX_MFA_ATTEMPTS },
      },
      include: {
        user: {
          include: { mfaFactors: { where: { confirmedAt: { not: null }, disabledAt: null } } },
        },
      },
    });

    for (const token of tokens) {
      if (await argon2.verify(token.tokenHash, challengeToken)) {
        const factor = token.user.mfaFactors[0];
        if (!factor) {
          throw new UnauthorizedException({ code: 'MFA_INVALID', message: 'No MFA factor enrolled' });
        }

        const secret = this.decryptSecret(factor.secretEncrypted);
        const totp = new OTPAuth.TOTP({
          secret: OTPAuth.Secret.fromBase32(secret),
          digits: 6,
          period: 30,
        });
        const delta = totp.validate({ token: code, window: 1 });

        if (delta === null) {
          const attempts = token.attemptCount + 1;
          await this.prisma.authToken.update({
            where: { id: token.id },
            data: {
              attemptCount: attempts,
              ...(attempts >= MAX_MFA_ATTEMPTS && { consumedAt: new Date() }),
            },
          });
          throw new UnauthorizedException({
            code: attempts >= MAX_MFA_ATTEMPTS ? 'MFA_LOCKED' : 'MFA_INVALID',
            message:
              attempts >= MAX_MFA_ATTEMPTS
                ? 'Too many invalid codes. Sign in again to request a new challenge.'
                : 'Invalid code',
          });
        }

        await this.prisma.authToken.update({
          where: { id: token.id },
          data: { consumedAt: new Date() },
        });
        return this.createSession(token.userId);
      }
    }

    throw new UnauthorizedException({
      code: 'TOKEN_INVALID',
      message: 'Challenge token invalid or expired',
    });
  }

  // ── Verify phone ──────────────────────────────────────────────────────────
  async verifyPhone(userId: string, code: string) {
    const tokens = await this.prisma.authToken.findMany({
      where: {
        userId,
        tokenType: 'PHONE_VERIFICATION',
        consumedAt: null,
        expiresAt: { gt: new Date() },
        attemptCount: { lt: MAX_VERIFICATION_ATTEMPTS },
      },
    });

    for (const token of tokens) {
      if (await argon2.verify(token.tokenHash, code)) {
        await this.prisma.$transaction([
          this.prisma.authToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
          this.prisma.user.update({ where: { id: userId }, data: { phoneVerifiedAt: new Date(), status: 'ACTIVE' } }),
        ]);
        return { verified: true };
      }
      const attempts = token.attemptCount + 1;
      await this.prisma.authToken.update({
        where: { id: token.id },
        data: {
          attemptCount: attempts,
          ...(attempts >= MAX_VERIFICATION_ATTEMPTS && { consumedAt: new Date() }),
        },
      });
    }

    throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'Invalid or expired verification code' });
  }

  // ── Forgot password ───────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    // Always return success to prevent user enumeration
    if (user) {
      const code = await this.createVerificationToken(user.id, 'PASSWORD_RESET', PASSWORD_RESET_TTL_MINUTES);
      this.logger.log(`Password reset requested for ${user.id}`);
      await this.mailer.sendVerificationCode(user.email, code, 'password reset');
    }
    return {
      message: 'If the account exists, a reset code has been sent to the registered email address.',
    };
  }

  // ── Reset password ────────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const tokens = await this.prisma.authToken.findMany({
      where: { tokenType: 'PASSWORD_RESET', consumedAt: null, expiresAt: { gt: new Date() } },
    });

    for (const authToken of tokens) {
      if (await argon2.verify(authToken.tokenHash, token)) {
        const passwordHash = await argon2.hash(newPassword);
        await this.prisma.$transaction([
          this.prisma.authToken.update({ where: { id: authToken.id }, data: { consumedAt: new Date() } }),
          this.prisma.user.update({ where: { id: authToken.userId }, data: { passwordHash } }),
          // Revoke all sessions
          this.prisma.authSession.updateMany({
            where: { userId: authToken.userId },
            data: { revokedAt: new Date() },
          }),
        ]);
        await this.audit.logAuthEvent(authToken.userId, 'auth.password.reset', {});
        return { message: 'Password updated. Please sign in again.' };
      }
    }

    throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'Invalid or expired reset token' });
  }

  // ── Refresh token ─────────────────────────────────────────────────────────
  async refreshToken(refreshToken: string) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await this.prisma.authSession.findFirst({
      where: { refreshTokenHash: hash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!session) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Session expired' });

    // Rotate refresh token
    const newRefreshToken = crypto.randomUUID() + '.' + crypto.randomBytes(32).toString('hex');
    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: newHash, lastUsedAt: new Date() },
    });

    const accessToken = this.signAccessToken(session.userId);
    return { accessToken, refreshToken: newRefreshToken };
  }

  // ── Revoke session ────────────────────────────────────────────────────────
  async revokeSession(sessionId: string, userId: string) {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
    await this.audit.logAuthEvent(userId, 'auth.session.revoked', { sessionId });
    return { revoked: true };
  }

  // ── MFA enrolment ─────────────────────────────────────────────────────────
  async enrollMfa(userId: string) {
    const existing = await this.prisma.mfaFactor.findFirst({
      where: { userId, confirmedAt: { not: null }, disabledAt: null },
    });
    if (existing) throw new ConflictException({ code: 'CONFLICT', message: 'MFA already enrolled' });

    const totp = new OTPAuth.TOTP({
      issuer: 'SokoOS',
      label: userId,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    const secret = totp.secret.base32;

    const factor = await this.prisma.mfaFactor.create({
      data: { userId, secretEncrypted: this.encryptSecret(secret) },
    });

    const qrCodeUrl = await QRCode.toDataURL(totp.toString());
    return { factorId: factor.id, secret, qrCode: qrCodeUrl };
  }

  async confirmMfa(userId: string, factorId: string, code: string) {
    const factor = await this.prisma.mfaFactor.findFirst({ where: { id: factorId, userId, confirmedAt: null } });
    if (!factor) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Factor not found' });

    const secret = this.decryptSecret(factor.secretEncrypted);
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 });
    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) throw new BadRequestException({ code: 'MFA_INVALID', message: 'Invalid code' });

    // Generate recovery codes
    const recoveryCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(8).toString('hex').toUpperCase().replace(/(.{4})/g, '$1-').slice(0, -1)
    );

    await this.prisma.$transaction([
      this.prisma.mfaFactor.update({ where: { id: factorId }, data: { confirmedAt: new Date() } }),
      this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } }),
      this.prisma.mfaRecoveryCode.createMany({
        data: await Promise.all(recoveryCodes.map(async (code) => ({
          mfaFactorId: factorId,
          codeHash: await argon2.hash(code),
        }))),
      }),
    ]);

    await this.audit.logAuthEvent(userId, 'auth.mfa.enabled', { factorId });
    return { confirmed: true, recoveryCodes };
  }

  // ── Private helpers ─────────────────────────────────────────────────████──
  /** Encrypt TOTP secrets at rest (AES-256-GCM, key derived from JWT_SECRET). */
  private getMfaKey(): Buffer {
    if (!this.mfaKey) {
      const secret = this.config.get('JWT_SECRET', { infer: true }) ?? 'sokoos-development-only';
      this.mfaKey = crypto.scryptSync(secret, 'sokoos-mfa-factor', 32);
    }
    return this.mfaKey;
  }

  private encryptSecret(secret: string): Uint8Array<ArrayBuffer> {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.getMfaKey(), iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const encoded = Buffer.from(
      `enc:v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`,
    );
    const bytes = new Uint8Array(encoded.length);
    bytes.set(encoded);
    return bytes;
  }

  private decryptSecret(stored: Uint8Array): string {
    const raw = Buffer.from(stored).toString('utf8');
    if (!raw.startsWith('enc:v1:')) return raw; // legacy plaintext factor
    const [, , iv, tag, data] = raw.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.getMfaKey(),
      Buffer.from(iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    rememberMe = false,
  ) {
    const refreshToken = crypto.randomUUID() + '.' + crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiryDays = rememberMe ? 90 : 30;
    await this.prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60_000),
      },
    });

    const accessToken = this.signAccessToken(userId);
    return { accessToken, refreshToken };
  }

  private signAccessToken(userId: string): string {
    return this.jwt.sign({ sub: userId }, {
      expiresIn: this.config.get('JWT_EXPIRES_IN', { infer: true }) ?? '15m',
    });
  }

  private async createVerificationToken(
    userId: string,
    tokenType: 'PHONE_VERIFICATION' | 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
    ttlMinutes = VERIFICATION_CODE_TTL_MINUTES,
  ) {
    const code = Math.floor(100_000 + Math.random() * 900_000).toString();
    const tokenHash = await argon2.hash(code);
    await this.prisma.authToken.create({
      data: {
        userId,
        tokenType,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });
    // In production: send via SMS provider
    this.logger.log(`[DEV] Verification code for ${userId}: ${code}`);
    return code;
  }
}
