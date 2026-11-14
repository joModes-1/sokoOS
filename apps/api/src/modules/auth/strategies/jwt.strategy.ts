import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { Env } from '../../../config/env.schema.js';

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private prisma: PrismaService,
    config: ConfigService<Env>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }) ?? '',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        mfaEnabled: true,
        userRoles: {
          where: { deletedAt: null },
          include: {
            business: {
              select: { id: true, slug: true, legalName: true, businessType: true, currency: true },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'User not found' });
    if (user.status === 'DELETED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException({ code: 'ACCOUNT_SUSPENDED', message: 'Account is not active' });
    }

    const businesses: Array<{ id: string; name: string; type: string }> = [];
    for (const userRole of user.userRoles) {
      if (!businesses.find((b) => b.id === userRole.businessId)) {
        businesses.push({
          id: userRole.businessId,
          name: userRole.business.legalName,
          type: userRole.business.businessType,
        });
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      // Roles/permissions are deliberately empty until TenantGuard scopes them to the
      // active business. Unioning them here allowed cross-tenant privilege escalation.
      roles: [] as string[],
      permissions: [] as string[],
      businesses,
      businessId: undefined as string | undefined,
    };
  }
}
