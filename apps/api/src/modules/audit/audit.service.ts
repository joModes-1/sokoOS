import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

interface AuditLogInput {
  businessId: string;
  actorUserId: string;
  /** Resolved from the actor's active role when omitted — 'SYSTEM' is only a fallback. */
  actorRoleCode?: string;
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
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /** Log within an existing transaction */
  async log(tx: Prisma.TransactionClient, input: AuditLogInput) {
    const actorRoleCode = input.actorRoleCode ?? (await this.resolveRoleCode(input.actorUserId));
    await tx.auditLog.create({
      data: {
        businessId: input.businessId,
        actorUserId: input.actorUserId,
        actorRoleCode,
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
    const actorRoleCode = input.actorRoleCode ?? (await this.resolveRoleCode(input.actorUserId));
    return this.prisma.auditLog.create({
      data: {
        businessId: input.businessId,
        actorUserId: input.actorUserId,
        actorRoleCode,
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

  /**
   * Best-effort audit write for authentication events. A failed audit write must never
   * lock an operator out of their own system, so failures are logged and swallowed.
   */
  async logSafe(input: AuditLogInput): Promise<void> {
    try {
      await this.logDirect(input);
    } catch (err) {
      this.logger.warn(`Audit write failed for ${input.action}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Audit an authentication event (login, MFA, password, session) for a user. The event is
   * attached to the user's active business; users who have not joined a business yet have no
   * tenant to scope the row to, so those events are skipped.
   */
  async logAuthEvent(
    userId: string,
    action: string,
    detail: Record<string, unknown> = {},
    ctx: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> {
    const membership = await this.prisma.userRole.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { businessId: true, role: { select: { code: true } } },
    });
    if (!membership) return;
    await this.logSafe({
      businessId: membership.businessId,
      actorUserId: userId,
      actorRoleCode: membership.role.code,
      action,
      targetType: 'User',
      targetId: userId,
      after: detail,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  private async resolveRoleCode(userId: string): Promise<string> {
    const membership = await this.prisma.userRole.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { role: { select: { code: true } } },
    });
    return membership?.role.code ?? 'SYSTEM';
  }

  async search(businessId: string, filters: {
    actorUserId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 25, actorUserId, action, targetType, targetId, dateFrom, dateTo } = filters;

    const where = {
      businessId,
      ...(actorUserId && { actorUserId }),
      ...(action && { action: { contains: action, mode: 'insensitive' as const } }),
      ...(targetType && { targetType }),
      ...(targetId && { targetId }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(`${dateTo}T23:59:59.999Z`) }),
        },
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { fullName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: rows.map(({ actor, ...log }) => ({
        ...log,
        actorName: actor?.fullName ?? 'System',
        actorEmail: actor?.email ?? null,
      })),
      total, page, limit,
    };
  }
}
