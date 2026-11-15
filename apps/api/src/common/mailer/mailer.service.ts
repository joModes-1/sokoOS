import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Env } from '../../config/env.schema.js';

/**
 * SMTP email delivery (Resend or any SMTP provider) for verification and reset codes.
 *
 * Deliberately fail-soft: a broken/unreachable provider must never block registration or
 * password reset — the error is logged and the caller continues (in pilot deploys the code
 * is still exposed in the response, so onboarding keeps working while email is down).
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService<Env>) {}

  private getTransport(): Transporter | null {
    if (this.transporter) return this.transporter;
    const host = this.config.get('SMTP_HOST', { infer: true });
    const port = this.config.get('SMTP_PORT', { infer: true }) ?? 587;
    const secure = this.config.get('SMTP_SECURE', { infer: true }) ?? false;
    const user = this.config.get('SMTP_USER', { infer: true });
    const pass = this.config.get('SMTP_PASS', { infer: true });
    if (!host || !user || !pass) {
      this.logger.warn('SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — email is skipped');
      return null;
    }
    this.transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    return this.transporter;
  }

  async sendVerificationCode(to: string, code: string, purpose: 'account verification' | 'password reset') {
    const from = this.config.get('EMAIL_FROM', { infer: true }) ?? 'SokoOS <no-reply@localhost>';
    const subject =
      purpose === 'password reset' ? 'Your SokoOS password reset code' : 'Verify your SokoOS account';
    await this.send({
      to,
      subject,
      text: `Your SokoOS ${purpose} code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email.`,
      html: `<p>Your SokoOS ${purpose} code is</p><p style="font-size:24px;letter-spacing:6px;font-weight:700">${code}</p><p>It expires in 15 minutes. If you did not request this, ignore this email.</p>`,
      from,
    });
  }

  async send(opts: { to: string; subject: string; text: string; html: string; from: string }) {
    const transport = this.getTransport();
    if (!transport) return false;
    try {
      const info = await transport.sendMail(opts);
      this.logger.log(`Email sent to ${opts.to}: ${info.messageId}`);
      return true;
    } catch (err) {
      // Fail-soft: log and continue — never block the auth flow on provider errors.
      this.logger.error(`Email to ${opts.to} failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
}
