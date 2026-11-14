import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async list(businessId: string) {
    return this.prisma.branch.findMany({ where: { businessId, deletedAt: null }, orderBy: { name: 'asc' } });
  }

  async create(businessId: string, data: { name: string; code: string; isWarehouse?: boolean; address?: object; phone?: string }) {
    const exists = await this.prisma.branch.findFirst({ where: { businessId, code: data.code, deletedAt: null } });
    if (exists) throw new ConflictException({ code: 'DUPLICATE_BRANCH_CODE', message: `Branch code "${data.code}" already exists` });
    return this.prisma.branch.create({ data: { businessId, ...data } });
  }

  async update(businessId: string, branchId: string, data: Partial<{ name: string; phone: string; address: object; allowNegativeStock: boolean }>) {
    return this.prisma.branch.update({ where: { id: branchId }, data });
  }

  async deactivate(businessId: string, branchId: string) {
    return this.prisma.branch.update({ where: { id: branchId }, data: { status: 'DEACTIVATED' } });
  }

  async getUsers(businessId: string, branchId: string) {
    return this.prisma.userBranch.findMany({
      where: { businessId, branchId, deletedAt: null },
      include: { user: true },
    });
  }

  async assignUser(businessId: string, branchId: string, userId: string, assignedBy: string) {
    return this.prisma.userBranch.create({ data: { businessId, branchId, userId, assignedBy } });
  }
}
