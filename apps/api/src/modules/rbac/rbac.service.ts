import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.userInvitation.create({
      data: {
        businessId, roleId: data.roleId,
        email: data.email, phone: data.phone,
        branchIds: data.branchIds ?? [],
        tokenHash, invitedBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
      },
    });
  }
}
