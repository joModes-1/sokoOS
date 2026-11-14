import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

interface AuditLogInput {
  businessId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /** Log within an existing transaction */
  async log(tx: Prisma.TransactionClient, input: AuditLogInput) {
    await tx.auditLog.create({
      data: {
        businessId: input.businessId,
        actorUserId: input.actorUserId,
        actorRoleCode: 'SYSTEM',
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        before: input.before ? (input.before as Prisma.InputJsonValue) : Prisma.JsonNull,
        after: input.after ? (input.after as Prisma.InputJsonValue) : Prisma.JsonNull,
        requestId: input.requestId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  /** Log outside a transaction */
  async logDirect(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        businessId: input.businessId,
        actorUserId: input.actorUserId,
        actorRoleCode: 'SYSTEM',
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        before: input.before ? (input.before as Prisma.InputJsonValue) : Prisma.JsonNull,
        after: input.after ? (input.after as Prisma.InputJsonValue) : Prisma.JsonNull,
        requestId: input.requestId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async search(businessId: string, filters: {
    actorUserId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 25, actorUserId, action, targetType, targetId } = filters;

    const where = {
      businessId,
      ...(actorUserId && { actorUserId }),
      ...(action && { action: { contains: action, mode: 'insensitive' as const } }),
      ...(targetType && { targetType }),
      ...(targetId && { targetId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
