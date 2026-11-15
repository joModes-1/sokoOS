import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { RegisterBusinessInput } from '@sokoos/shared';
import { ROLE_DEFAULTS } from '@sokoos/shared';

const SYSTEM_PERMISSIONS = [
  { code: 'admin.*', category: 'admin', description: 'Full access' },
  { code: 'sales.create', category: 'sales', description: 'Create sales' },
  { code: 'sales.refund', category: 'sales', description: 'Process refunds' },
  { code: 'sales.discount', category: 'sales', description: 'Apply discounts' },
  { code: 'sales.view', category: 'sales', description: 'View sales history' },
  { code: 'inventory.view', category: 'inventory', description: 'View inventory' },
  { code: 'inventory.adjust', category: 'inventory', description: 'Make adjustments' },
  { code: 'inventory.count', category: 'inventory', description: 'Start stock counts' },
  { code: 'transfer.request', category: 'transfer', description: 'Request transfers' },
  { code: 'transfer.approve', category: 'transfer', description: 'Approve transfers' },
  { code: 'transfer.dispatch', category: 'transfer', description: 'Dispatch transfers' },
  { code: 'transfer.receive', category: 'transfer', description: 'Receive transfers' },
  { code: 'po.create', category: 'purchasing', description: 'Create purchase orders' },
  { code: 'po.submit', category: 'purchasing', description: 'Submit purchase orders' },
  { code: 'po.confirm', category: 'purchasing', description: 'Confirm purchase orders' },
  { code: 'po.receive', category: 'purchasing', description: 'Receive goods' },
  { code: 'catalogue.manage', category: 'catalogue', description: 'Manage catalogue' },
  { code: 'finance.view', category: 'finance', description: 'View finance' },
  { code: 'finance.close', category: 'finance', description: 'Close the day' },
  { code: 'reports.view', category: 'reports', description: 'View reports' },
  { code: 'users.manage', category: 'users', description: 'Manage users' },
  { code: 'users.invite', category: 'users', description: 'Invite users' },
];

@Injectable()
export class BusinessesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async registerBusiness(userId: string, input: RegisterBusinessInput) {
    // Generate slug if not provided
    const baseSlug = input.slug ?? input.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50);
    let slug = baseSlug;
    let attempt = 0;
    while (true) {
      const exists = await this.prisma.business.findFirst({ where: { slug } });
      if (!exists) break;
      slug = `${baseSlug}-${++attempt}`;
    }

    // Create business, settings, default branch, roles, and owner role in one transaction
    return this.prisma.$transaction(async (tx) => {
      // Ensure permissions catalogue exists
      await tx.permission.createMany({
        data: SYSTEM_PERMISSIONS,
        skipDuplicates: true,
      });

      // Create business
      const business = await tx.business.create({
        data: {
          legalName: input.businessName,
          slug,
          businessType: input.businessType,
          tin: input.tin,
          currency: 'UGX',
          ownerUserId: userId,
          status: 'ACTIVE',
        },
      });

      // Business settings
      await tx.businessSettings.create({
        data: { businessId: business.id },
      });

      // Subscription (read-only record)
      await tx.subscription.create({
        data: {
          businessId: business.id,
          planCode: 'FREE',
          status: 'ACTIVE',
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 365 * 24 * 60 * 60_000),
        },
      });

      // Default branch
      const branch = await tx.branch.create({
        data: {
          businessId: business.id,
          name: input.branchName,
          code: input.branchCode,
          status: 'ACTIVE',
        },
      });

      // Create the 4 system roles
      const roleCodes = ['BUSINESS_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'INVENTORY_CLERK'] as const;
      const roleNames = { BUSINESS_ADMIN: 'Business Admin', BRANCH_MANAGER: 'Branch Manager', CASHIER: 'Cashier', INVENTORY_CLERK: 'Inventory Clerk' };
      const roles: { id: string; code: string }[] = [];
      for (const code of roleCodes) {
        const role = await tx.role.create({
          data: { businessId: business.id, code, name: roleNames[code], isSystem: true },
        });
        roles.push({ id: role.id, code });
      }

      // Assign permissions to each role — one lookup + one bulk insert (a query per
      // permission is 100+ round trips, which times out against a remote DB).
      const allPerms = await tx.permission.findMany({ select: { id: true, code: true } });
      const permIdByCode = new Map(allPerms.map(p => [p.code, p.id]));
      const rolePermRows = roles.flatMap(role =>
        (ROLE_DEFAULTS[role.code as keyof typeof ROLE_DEFAULTS] as readonly string[])
          .filter(code => permIdByCode.has(code))
          .map(code => ({ roleId: role.id, permissionId: permIdByCode.get(code)! })),
      );
      await tx.rolePermission.createMany({ data: rolePermRows, skipDuplicates: true });

      // Assign BUSINESS_ADMIN role to the owner
      const adminRole = roles.find(r => r.code === 'BUSINESS_ADMIN')!;
      await tx.userRole.create({
        data: { userId, businessId: business.id, roleId: adminRole.id, grantedBy: userId },
      });

      // Assign owner to default branch
      await tx.userBranch.create({
        data: { userId, businessId: business.id, branchId: branch.id, assignedBy: userId },
      });

      return { business, branch };
    }, { maxWait: 10_000, timeout: 30_000 });
  }

  async getProfile(businessId: string, userId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      include: { settings: true, subscription: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async updateProfile(businessId: string, userId: string, data: Partial<{ legalName: string; tin: string; contactPhone: string; address: object }>) {
    const before = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { legalName: true, tin: true, contactPhone: true, address: true },
    });
    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data,
    });
    await this.audit.logDirect({
      businessId, actorUserId: userId,
      action: 'business.profile.update',
      targetType: 'Business', targetId: businessId,
      before: before as unknown as Record<string, unknown>,
      after: data as Record<string, unknown>,
    });
    return updated;
  }

  async updateSettings(businessId: string, userId: string, data: Partial<{ defaultTaxRateBp: number; allowNegativeStock: boolean; receiptFooterText: string; timezone: string }>) {
    const before = await this.prisma.businessSettings.findUnique({
      where: { businessId },
      select: { defaultTaxRateBp: true, allowNegativeStock: true, receiptFooterText: true, timezone: true },
    });
    const updated = await this.prisma.businessSettings.update({
      where: { businessId },
      data,
    });
    await this.audit.logDirect({
      businessId, actorUserId: userId,
      action: 'business.settings.update',
      targetType: 'BusinessSettings', targetId: businessId,
      before: before as unknown as Record<string, unknown>,
      after: data as Record<string, unknown>,
    });
    return updated;
  }
}
