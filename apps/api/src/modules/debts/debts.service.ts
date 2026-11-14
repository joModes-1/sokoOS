import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { CreateDebtInput, RecordDebtPaymentInput } from '@sokoos/shared';

/**
 * Customer credit ("they took it on debt").
 *
 * The unit of record is one debt per item/basket taken — a customer who takes sugar today and
 * soap next week has two debts, and pays them off at their own pace with any number of small
 * payments. That is why nothing here mutates a balance on a customer: the app-side truth is the
 * pair (amountMinor, paidMinor) on each debt plus its immutable payment rows.
 *
 * Status is always derived, never supplied by the caller:
 *   paidMinor === 0        → OPEN
 *   0 < paidMinor < amount → PARTIALLY_PAID
 *   paidMinor >= amount    → SETTLED (paidMinor is capped at amountMinor, overpay is rejected)
 *   WRITTEN_OFF is a deliberate manual decision and is terminal.
 */
@Injectable()
export class DebtsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────
  async list(
    businessId: string,
    filters: { status?: string; q?: string; customerId?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 200);

    const where: Prisma.CustomerDebtWhereInput = {
      businessId,
      ...(filters.customerId && { customerId: filters.customerId }),
      ...(filters.status && filters.status !== 'ALL' && { status: filters.status as never }),
      // "Outstanding" is the screen's default: anything that is neither settled nor written off.
      ...(!filters.status && { status: { in: ['OPEN', 'PARTIALLY_PAID'] } }),
      ...(filters.q && {
        OR: [
          { customerName: { contains: filters.q, mode: 'insensitive' } },
          { customerPhone: { contains: filters.q } },
          { itemSummary: { contains: filters.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total, outstanding] = await Promise.all([
      this.prisma.customerDebt.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { payments: { orderBy: { paidAt: 'desc' } } },
      }),
      this.prisma.customerDebt.count({ where }),
      this.prisma.customerDebt.aggregate({
        where: { businessId, status: { in: ['OPEN', 'PARTIALLY_PAID'] } },
        _sum: { amountMinor: true, paidMinor: true },
      }),
    ]);

    const num = (v: bigint | null | undefined) => Number(v ?? 0n);
    return {
      data: rows.map((r) => this.shape(r)),
      total,
      page,
      limit,
      outstandingMinor: num(outstanding._sum.amountMinor) - num(outstanding._sum.paidMinor),
    };
  }

  // ── One person's whole history ────────────────────────────────────────────
  async byCustomer(businessId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const debts = await this.prisma.customerDebt.findMany({
      where: { businessId, customerId },
      orderBy: { createdAt: 'desc' },
      include: { payments: { orderBy: { paidAt: 'desc' } } },
    });

    const num = (v: bigint) => Number(v);
    const outstandingMinor = debts.reduce(
      (sum, d) => sum + (d.status === 'SETTLED' || d.status === 'WRITTEN_OFF' ? 0 : num(d.amountMinor - d.paidMinor)),
      0,
    );

    return {
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
      outstandingMinor,
      debts: debts.map((d) => this.shape(d)),
    };
  }

  // ── Grouped "by person" view ──────────────────────────────────────────────
  /**
   * One row per person who still owes something, newest activity first. Grouped in the database
   * rather than in the client so the tab stays correct beyond the first page of debts.
   *
   * People are grouped by customer id when the debt is linked, and otherwise by phone; debts with
   * neither are their own row, named from `customerName`.
   */
  async byPerson(businessId: string, q?: string) {
    const rows = await this.prisma.customerDebt.findMany({
      where: {
        businessId,
        status: { in: ['OPEN', 'PARTIALLY_PAID'] },
        ...(q && {
          OR: [
            { customerName: { contains: q, mode: 'insensitive' } },
            { customerPhone: { contains: q } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      include: { payments: { orderBy: { paidAt: 'desc' }, take: 1 } },
    });

    interface PersonRow {
      key: string;
      customerId: string | null;
      name: string;
      phone: string | null;
      debtCount: number;
      outstandingMinor: number;
      totalMinor: number;
      lastPaymentAt: string | null;
      lastActivityAt: string;
      oldestDueAt: string | null;
      items: string[];
    }

    const people = new Map<string, PersonRow>();
    for (const d of rows) {
      const key = d.customerId ?? d.customerPhone ?? `debt:${d.id}`;
      const existing = people.get(key);
      const lastPayment = d.payments[0]?.paidAt ?? null;
      const outstanding = Number(d.amountMinor - d.paidMinor);
      if (existing) {
        existing.debtCount += 1;
        existing.outstandingMinor += outstanding;
        existing.totalMinor += Number(d.amountMinor);
        if (d.itemSummary) existing.items.push(d.itemSummary);
        if (lastPayment && (!existing.lastPaymentAt || lastPayment.toISOString() > existing.lastPaymentAt)) {
          existing.lastPaymentAt = lastPayment.toISOString();
        }
        if (d.createdAt.toISOString() > existing.lastActivityAt) existing.lastActivityAt = d.createdAt.toISOString();
        if (d.dueAt && (!existing.oldestDueAt || d.dueAt.toISOString() < existing.oldestDueAt)) {
          existing.oldestDueAt = d.dueAt.toISOString();
        }
      } else {
        people.set(key, {
          key,
          customerId: d.customerId,
          name: d.customerName,
          phone: d.customerPhone,
          debtCount: 1,
          outstandingMinor: outstanding,
          totalMinor: Number(d.amountMinor),
          lastPaymentAt: lastPayment?.toISOString() ?? null,
          lastActivityAt: d.createdAt.toISOString(),
          oldestDueAt: d.dueAt?.toISOString() ?? null,
          items: d.itemSummary ? [d.itemSummary] : [],
        });
      }
    }

    return Array.from(people.values()).sort((a, b) => b.outstandingMinor - a.outstandingMinor);
  }

  // ── Summary for the page header and the dashboard ─────────────────────────
  async summary(businessId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [openDebts, overdueCount, collected, current, top] = await Promise.all([
      this.prisma.customerDebt.aggregate({
        where: { businessId, status: { in: ['OPEN', 'PARTIALLY_PAID'] } },
        _sum: { amountMinor: true, paidMinor: true },
        _count: { _all: true },
      }),
      this.prisma.customerDebt.count({
        where: { businessId, status: { in: ['OPEN', 'PARTIALLY_PAID'] }, dueAt: { lt: now } },
      }),
      this.prisma.debtPayment.aggregate({
        where: { businessId, paidAt: { gte: startOfMonth } },
        _sum: { amountMinor: true },
      }),
      this.prisma.customerDebt.findMany({
        where: { businessId, status: { in: ['OPEN', 'PARTIALLY_PAID'] } },
        select: { customerId: true, customerPhone: true, customerName: true },
        distinct: ['customerId'],
      }),
      this.prisma.customerDebt.groupBy({
        by: ['customerName', 'customerPhone'],
        where: { businessId, status: { in: ['OPEN', 'PARTIALLY_PAID'] } },
        _sum: { amountMinor: true, paidMinor: true },
        orderBy: { _sum: { amountMinor: 'desc' } },
        take: 5,
      }),
    ]);

    const num = (v: bigint | null | undefined) => Number(v ?? 0n);
    const outstandingMinor = num(openDebts._sum.amountMinor) - num(openDebts._sum.paidMinor);

    return {
      outstandingMinor,
      openCount: openDebts._count._all,
      overdueCount,
      // Distinct people owing: linked customers counted once, unlinked debts counted by phone.
      debtorCount: new Set(current.map((d) => d.customerId ?? d.customerPhone ?? d.customerName)).size,
      collectedThisMonthMinor: num(collected._sum.amountMinor),
      topDebtors: top.map((t) => ({
        name: t.customerName,
        phone: t.customerPhone,
        outstandingMinor: num(t._sum.amountMinor) - num(t._sum.paidMinor),
      })),
    };
  }

  // ── Create ────────────────────────────────────────────────────────────────
  async create(businessId: string, userId: string, input: CreateDebtInput) {
    const phone = input.customerPhone?.trim() || null;

    // Link to an existing person by phone when we have one, so their next debt lands in the same
    // history. A typed name alone is not trusted as an identity — two customers can share a name.
    let customerId: string | null = null;
    if (phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { businessId, phone, deletedAt: null },
        select: { id: true },
      });
      if (existing) {
        customerId = existing.id;
      } else {
        const created = await this.prisma.customer.create({
          data: { businessId, name: input.customerName, phone },
          select: { id: true },
        });
        customerId = created.id;
      }
    }

    const debt = await this.prisma.customerDebt.create({
      data: {
        businessId,
        customerId,
        customerName: input.customerName,
        customerPhone: phone,
        itemSummary: input.itemSummary?.trim() || null,
        amountMinor: input.amountMinor,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        note: input.note?.trim() || null,
        createdBy: userId,
        status: 'OPEN',
      },
      include: { payments: true },
    });

    await this.audit.logDirect({
      businessId,
      actorUserId: userId,
      action: 'debt.create',
      targetType: 'CustomerDebt',
      targetId: debt.id,
      after: {
        customerName: debt.customerName,
        amountMinor: Number(debt.amountMinor),
        itemSummary: debt.itemSummary,
      },
    });

    return this.shape(debt);
  }

  // ── Record a (possibly partial) payment ───────────────────────────────────
  async recordPayment(businessId: string, userId: string, debtId: string, input: RecordDebtPaymentInput) {
    const debt = await this.prisma.customerDebt.findFirst({
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
      this.prisma.debtPayment.create({
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
      this.prisma.customerDebt.update({
        where: { id: debt.id },
        data: {
          paidMinor,
          status,
          settledAt: status === 'SETTLED' ? paidAt : null,
        },
        include: { payments: { orderBy: { paidAt: 'desc' } } },
      }),
    ]);

    await this.audit.logDirect({
      businessId,
      actorUserId: userId,
      action: 'debt.payment',
      targetType: 'CustomerDebt',
      targetId: debt.id,
      before: { paidMinor: Number(debt.paidMinor), status: debt.status },
      after: { paidMinor: Number(paidMinor), status, amountMinor: Number(input.amountMinor) },
    });

    return this.shape(updated);
  }

  // ── Write off ─────────────────────────────────────────────────────────────
  async writeOff(businessId: string, userId: string, debtId: string, reason?: string | null) {
    const debt = await this.prisma.customerDebt.findFirst({ where: { id: debtId, businessId } });
    if (!debt) throw new NotFoundException('Debt not found');
    if (debt.status === 'SETTLED') throw new BadRequestException('This debt is already settled');
    if (debt.status === 'WRITTEN_OFF') throw new ForbiddenException('This debt is already written off');

    const updated = await this.prisma.customerDebt.update({
      where: { id: debt.id },
      data: {
        status: 'WRITTEN_OFF',
        note: reason?.trim() || debt.note,
      },
      include: { payments: { orderBy: { paidAt: 'desc' } } },
    });

    await this.audit.logDirect({
      businessId,
      actorUserId: userId,
      action: 'debt.write_off',
      targetType: 'CustomerDebt',
      targetId: debt.id,
      before: { status: debt.status },
      after: { status: 'WRITTEN_OFF', reason: reason ?? null },
    });

    return this.shape(updated);
  }

  // ── Shape ─────────────────────────────────────────────────────────────────
  private shape(d: {
    id: string; customerId: string | null; customerName: string; customerPhone: string | null;
    itemSummary: string | null; amountMinor: bigint; paidMinor: bigint; currency: string;
    status: string; dueAt: Date | null; note: string | null; settledAt: Date | null;
    createdAt: Date; updatedAt: Date;
    payments: { id: string; amountMinor: bigint; method: string; note: string | null; paidAt: Date }[];
  }) {
    return {
      id: d.id,
      customerId: d.customerId,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
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