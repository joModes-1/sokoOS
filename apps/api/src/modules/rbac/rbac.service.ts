import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class RbacService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async listRoles(businessId: string) {
    return this.prisma.role.findMany({ where: { businessId, deletedAt: null }, include: { rolePermissions: { include: { permission: true } }, userRoles: { where: { deletedAt: null } } } });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { code: 'asc' }] });
  }

  async listUsers(businessId: string) {
    return this.prisma.userRole.findMany({
      where: { businessId, deletedAt: null },
      include: { user: true, role: true },
    });
  }

  async inviteUser(businessId: string, invitedBy: string, data: { email?: string; phone?: string; roleId: string; branchIds?: string[] }) {
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const argon2 = await import('argon2');
    const tokenHash = await argon2.hash(token);
    const invitation = await this.prisma.userInvitation.create({
      data: {
        businessId, roleId: data.roleId,
        email: data.email, phone: data.phone,
        branchIds: data.branchIds ?? [],
        tokenHash, invitedBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
      },
    });

    await this.audit.logDirect({
      businessId, actorUserId: invitedBy,
      action: 'user.invite.create',
      targetType: 'UserInvitation', targetId: invitation.id,
      after: { email: data.email ?? null, phone: data.phone ?? null, roleId: data.roleId, branchIds: data.branchIds ?? [] },
    });

    return invitation;
  }
}
