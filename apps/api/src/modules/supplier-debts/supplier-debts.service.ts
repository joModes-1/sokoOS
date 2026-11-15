import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { CreateSupplierDebtInput, RecordDebtPaymentInput } from '@sokoos/shared';

/**
 * Supplier credit — goods the shop took from a wholesaler on credit ("you owe them").
 *
 * Mirrors customer credit in DebtsService: one debt per delivery/basket, an immutable
 * SupplierDebtPayment row per payment, and derived status —
 *   paidMinor === 0        → OPEN
 *   0 < paidMinor < amount → PARTIALLY_PAID
 *   paidMinor >= amount    → SETTLED (overpay is rejected)
 *   WRITTEN_OFF is a deliberate manual decision (e.g. disputed delivery) and is terminal.
 *
 * The supplier must already exist — a debt is always linked to a Supplier row, not to typed text.
 */
@Injectable()
export class SupplierDebtsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────
  async list(
    businessId: string,
    filters: { status?: string; q?: string; supplierId?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 200);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const where: Prisma.SupplierDebtWhereInput = {
      businessId,
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.status && filters.status !== 'ALL' && { status: filters.status as never }),
      // "Outstanding" is the screen's default: anything that is neither settled nor written off.
      ...(!filters.status && { status: { in: ['OPEN', 'PARTIALLY_PAID'] } }),
      ...(filters.q && {
        OR: [
          { supplier: { name: { contains: filters.q, mode: 'insensitive' } } },
          { itemSummary: { contains: filters.q, mode: 'insensitive' } },
          { poNumber: { contains: filters.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total, outstanding, overdueCount, paidThisMonth] = await Promise.all([
      this.prisma.supplierDebt.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          payments: { orderBy: { paidAt: 'desc' } },
          supplier: { select: { name: true, phone: true } },
        },
      }),
      this.prisma.supplierDebt.count({ where }),
      this.prisma.supplierDebt.aggregate({
        where: { businessId, status: { in: ['OPEN', 'PARTIALLY_PAID'] } },
        _sum: { amountMinor: true, paidMinor: true },
        _count: { _all: true },
      }),
      this.prisma.supplierDebt.count({
        where: { businessId, status: { in: ['OPEN', 'PARTIALLY_PAID'] }, dueAt: { lt: now } },
      }),
      this.prisma.supplierDebtPayment.aggregate({
        where: { businessId, paidAt: { gte: startOfMonth } },
        _sum: { amountMinor: true },
      }),
    ]);

    const num = (v: bigint | null | undefined) => Number(v ?? 0n);
    return {
      data: rows.map((r) => this.shape(r)),
      total,
      page,
      limit,
      outstandingMinor: num(outstanding._sum.amountMinor) - num(outstanding._sum.paidMinor),
      openCount: outstanding._count._all,
      overdueCount,
      paidThisMonthMinor: num(paidThisMonth._sum.amountMinor),
    };
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async create(businessId: string, userId: string, input: CreateSupplierDebtInput) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: input.supplierId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const debt = await this.prisma.supplierDebt.create({
      data: {
        businessId,
        supplierId: input.supplierId,
        itemSummary: input.itemSummary?.trim() || null,
        poNumber: input.poNumber?.trim() || null,
        amountMinor: input.amountMinor,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        note: input.note?.trim() || null,
        createdBy: userId,
        status: 'OPEN',
      },
      include: {
        payments: true,
        supplier: { select: { name: true, phone: true } },
      },
    });

    await this.audit.logDirect({
      businessId,
      actorUserId: userId,
      action: 'supplier_debt.create',
      targetType: 'SupplierDebt',
      targetId: debt.id,
      after: {
        supplierName: debt.supplier.name,
        amountMinor: Number(debt.amountMinor),
        itemSummary: debt.itemSummary,
      },
    });

    return this.shape(debt);
  }

  // ── Record a (possibly partial) payment ───────────────────────────────────
  async recordPayment(businessId: string, userId: string, debtId: string, input: RecordDebtPaymentInput) {
    const debt = await this.prisma.supplierDebt.findFirst({
      where: { id: debtId, businessId },
      include: { payments: true },
    });
    if (!debt) throw new NotFoundException('Debt not found');
    if (debt.status === 'SETTLED') throw new BadRequestException('This debt is already settled');
    if (debt.status === 'WRITTEN_OFF') throw new BadRequestException('This debt was written off');

    const remaining = debt.amountMinor - debt.paidMinor;
    if (input.amountMinor > remaining) {
      const fmt = Number(remaining).toLocaleString('en-UG');
      throw new BadRequestException(`Payment is more than the ${fmt} still owed on this debt`);
    }

    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
    if (Number.isNaN(paidAt.getTime())) throw new BadRequestException('Invalid payment date');

    const paidMinor = debt.paidMinor + input.amountMinor;
    const status = paidMinor >= debt.amountMinor ? 'SETTLED' : 'PARTIALLY_PAID';

    const [, updated] = await this.prisma.$transaction([
      this.prisma.supplierDebtPayment.create({
        data: {
          debtId: debt.id,
          businessId,
          amountMinor: input.amountMinor,
          method: input.method,
          note: input.note?.trim() || null,
          paidAt,
          recordedBy: userId,
        },
      }),
      this.prisma.supplierDebt.update({
        where: { id: debt.id },
        data: {
          paidMinor,
          status,
          settledAt: status === 'SETTLED' ? paidAt : null,
        },
        include: {
          payments: { orderBy: { paidAt: 'desc' } },
          supplier: { select: { name: true, phone: true } },
        },
      }),
    ]);

    await this.audit.logDirect({
      businessId,
      actorUserId: userId,
      action: 'supplier_debt.payment',
      targetType: 'SupplierDebt',
      targetId: debt.id,
      before: { paidMinor: Number(debt.paidMinor), status: debt.status },
      after: { paidMinor: Number(paidMinor), status, amountMinor: Number(input.amountMinor) },
    });

    return this.shape(updated);
  }

  // ── Write off ─────────────────────────────────────────────────────────────
  async writeOff(businessId: string, userId: string, debtId: string, reason?: string | null) {
    const debt = await this.prisma.supplierDebt.findFirst({ where: { id: debtId, businessId } });
    if (!debt) throw new NotFoundException('Debt not found');
    if (debt.status === 'SETTLED') throw new BadRequestException('This debt is already settled');
    if (debt.status === 'WRITTEN_OFF') throw new ForbiddenException('This debt is already written off');

    const updated = await this.prisma.supplierDebt.update({
      where: { id: debt.id },
      data: {
        status: 'WRITTEN_OFF',
        note: reason?.trim() || debt.note,
      },
      include: {
        payments: { orderBy: { paidAt: 'desc' } },
        supplier: { select: { name: true, phone: true } },
      },
    });

    await this.audit.logDirect({
      businessId,
      actorUserId: userId,
      action: 'supplier_debt.write_off',
      targetType: 'SupplierDebt',
      targetId: debt.id,
      before: { status: debt.status },
      after: { status: 'WRITTEN_OFF', reason: reason ?? null },
    });

    return this.shape(updated);
  }

  // ── Shape ─────────────────────────────────────────────────────────────────
  private shape(d: {
    id: string; supplierId: string; itemSummary: string | null; poNumber: string | null;
    amountMinor: bigint; paidMinor: bigint; currency: string;
    status: string; dueAt: Date | null; note: string | null; settledAt: Date | null;
    createdAt: Date; updatedAt: Date;
    supplier: { name: string; phone: string | null };
    payments: { id: string; amountMinor: bigint; method: string; note: string | null; paidAt: Date }[];
  }) {
    return {
      id: d.id,
      supplierId: d.supplierId,
      supplierName: d.supplier.name,
      supplierPhone: d.supplier.phone,
      poNumber: d.poNumber,
      itemSummary: d.itemSummary,
      amountMinor: Number(d.amountMinor),
      paidMinor: Number(d.paidMinor),
      balanceMinor: Number(d.amountMinor - d.paidMinor),
      currency: d.currency,
      status: d.status,
      dueAt: d.dueAt?.toISOString() ?? null,
      note: d.note,
      settledAt: d.settledAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      payments: d.payments.map((p) => ({
        id: p.id,
        amountMinor: Number(p.amountMinor),
        method: p.method,
        note: p.note,
        paidAt: p.paidAt.toISOString(),
      })),
    };
  }
}
