import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(businessId: string, branchId?: string, days = 30) {
    const TZ = 'Africa/Kampala';
    const span = Math.min(Math.max(days, 7), 90);
    const branchSql = branchId ? Prisma.sql`AND s.branch_id = ${branchId}::uuid` : Prisma.empty;
    const live = Prisma.sql`s.business_id = ${businessId}::uuid AND s.status IN ('COMPLETED','PARTIALLY_REFUNDED') ${branchSql}`;
    const num = (v: unknown) => Number(v ?? 0);

    // Local (Kampala) calendar window: [today - span + 1, today]
    const [{ today }] = await this.prisma.$queryRaw<{ today: Date }[]>(
      Prisma.sql`SELECT (now() AT TIME ZONE ${TZ})::date AS today`,
    );
    const todayStr = today.toISOString().slice(0, 10);
    const inRange = Prisma.sql`(s.completed_at AT TIME ZONE ${TZ})::date > (${todayStr}::date - ${span}::int)`;

    const [daily, hourly, products, categories, payments, lowStock, recent, pendingTransfers, pendingPOs, debtTotals, overdueDebts] = await Promise.all([
      this.prisma.$queryRaw<{ d: Date; revenue: bigint; txns: bigint; profit: bigint }[]>(Prisma.sql`
        SELECT (s.completed_at AT TIME ZONE ${TZ})::date AS d,
               SUM(s.total_minor) AS revenue,
               COUNT(*) AS txns,
               COALESCE(SUM(p.profit), 0) AS profit
        FROM sales s
        LEFT JOIN LATERAL (
          SELECT SUM(si.line_total_minor - (si.quantity * COALESCE(si.unit_cost_minor, 0))::bigint) AS profit
          FROM sale_items si WHERE si.sale_id = s.id
        ) p ON true
        WHERE ${live} AND ${inRange}
        GROUP BY 1 ORDER BY 1`),
      this.prisma.$queryRaw<{ h: number; revenue: bigint; txns: bigint }[]>(Prisma.sql`
        SELECT EXTRACT(HOUR FROM s.completed_at AT TIME ZONE ${TZ})::int AS h,
               SUM(s.total_minor) AS revenue, COUNT(*) AS txns
        FROM sales s
        WHERE ${live} AND ${inRange}
        GROUP BY 1 ORDER BY 1`),
      this.prisma.$queryRaw<{ name: string; qty: unknown; revenue: bigint; profit: bigint }[]>(Prisma.sql`
        SELECT pr.name, SUM(si.quantity) AS qty, SUM(si.line_total_minor) AS revenue,
               SUM(si.line_total_minor - (si.quantity * COALESCE(si.unit_cost_minor, 0))::bigint) AS profit
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN product_variants v ON v.id = si.product_variant_id
        JOIN products pr ON pr.id = v.product_id
        WHERE ${live} AND ${inRange}
        GROUP BY pr.name ORDER BY revenue DESC LIMIT 6`),
      this.prisma.$queryRaw<{ name: string; revenue: bigint }[]>(Prisma.sql`
        SELECT COALESCE(c.name, 'Uncategorised') AS name, SUM(si.line_total_minor) AS revenue
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN product_variants v ON v.id = si.product_variant_id
        JOIN products pr ON pr.id = v.product_id
        LEFT JOIN categories c ON c.id = pr.category_id
        WHERE ${live} AND ${inRange}
        GROUP BY 1 ORDER BY revenue DESC`),
      this.prisma.$queryRaw<{ method: string; total: bigint; txns: bigint }[]>(Prisma.sql`
        SELECT pay.method::text AS method, SUM(pay.amount_minor) AS total, COUNT(*) AS txns
        FROM payments pay JOIN sales s ON s.id = pay.sale_id
        WHERE ${live} AND pay.status = 'SUCCEEDED' AND ${inRange}
        GROUP BY 1 ORDER BY total DESC`),
      this.prisma.$queryRaw<{ name: string; on_hand: unknown; reorder: unknown }[]>(Prisma.sql`
        SELECT pr.name, SUM(b.quantity_on_hand) AS on_hand, pr.reorder_level AS reorder
        FROM inventory_balances b
        JOIN product_variants v ON v.id = b.product_variant_id
        JOIN products pr ON pr.id = v.product_id
        WHERE b.business_id = ${businessId}::uuid AND pr.deleted_at IS NULL AND pr.is_active
          ${branchId ? Prisma.sql`AND b.branch_id = ${branchId}::uuid` : Prisma.empty}
        GROUP BY pr.id, pr.name, pr.reorder_level
        HAVING SUM(b.quantity_on_hand) <= pr.reorder_level
        ORDER BY SUM(b.quantity_on_hand) / NULLIF(pr.reorder_level, 0) ASC, pr.name`),
      this.prisma.sale.findMany({
        where: { businessId, ...(branchId && { branchId }), status: { in: ['COMPLETED', 'PARTIALLY_REFUNDED'] } },
        orderBy: { completedAt: 'desc' }, take: 6,
        include: { receipt: true, payments: { take: 1 }, _count: { select: { items: true } } },
      }),
      this.prisma.stockTransfer.count({ where: { businessId, status: 'REQUESTED' } }),
      this.prisma.purchaseOrder.count({ where: { businessId, status: { in: ['SUBMITTED', 'CONFIRMED'] } } }),
      // Money owed to the business by customers who took goods on credit. Business-wide on
      // purpose: a debt is owed to the shop, not to one branch, and the person may repay anywhere.
      this.prisma.customerDebt.aggregate({
        where: { businessId, status: { in: ['OPEN', 'PARTIALLY_PAID'] } },
        _sum: { amountMinor: true, paidMinor: true },
        _count: { _all: true },
      }),
      this.prisma.customerDebt.count({
        where: { businessId, status: { in: ['OPEN', 'PARTIALLY_PAID'] }, dueAt: { lt: new Date() } },
      }),
    ]);

    // Zero-fill every local day so charts have a continuous axis
    const byDay = new Map(daily.map(r => [r.d.toISOString().slice(0, 10), r]));
    const salesByDay = Array.from({ length: span }, (_, i) => {
      const d = new Date(today.getTime() - (span - 1 - i) * 86400000).toISOString().slice(0, 10);
      const r = byDay.get(d);
      return { date: d, revenue: num(r?.revenue), transactions: num(r?.txns), profit: num(r?.profit) };
    });
    const sum = (rows: typeof salesByDay, k: 'revenue' | 'transactions' | 'profit') => rows.reduce((a, r) => a + r[k], 0);
    const todayRow = salesByDay[span - 1]!;
    const yesterdayRow = salesByDay[span - 2]!;
    const last7 = salesByDay.slice(-7);
    const prev7 = salesByDay.slice(-14, -7);

    const hours = new Map(hourly.map(h => [h.h, h]));
    const salesByHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: num(hours.get(h)?.revenue), transactions: num(hours.get(h)?.txns) }))
      .filter(h => h.hour >= 6 && h.hour <= 22);

    return {
      currency: 'UGX',
      rangeDays: span,
      asOf: new Date().toISOString(),
      kpis: {
        revenueToday: todayRow.revenue,
        revenueYesterday: yesterdayRow.revenue,
        transactionsToday: todayRow.transactions,
        transactionsYesterday: yesterdayRow.transactions,
        revenue7d: sum(last7, 'revenue'),
        revenuePrev7d: sum(prev7, 'revenue'),
        revenueRange: sum(salesByDay, 'revenue'),
        profitRange: sum(salesByDay, 'profit'),
        transactionsRange: sum(salesByDay, 'transactions'),
        avgBasketRange: sum(salesByDay, 'transactions') ? Math.round(sum(salesByDay, 'revenue') / sum(salesByDay, 'transactions')) : 0,
      },
      salesByDay,
      salesByHour,
      topProducts: products.map(p => ({ name: p.name, qty: num(p.qty), revenue: num(p.revenue), profit: num(p.profit) })),
      categories: categories.map(c => ({ name: c.name, revenue: num(c.revenue) })),
      payments: payments.map(p => ({ method: p.method, total: num(p.total), transactions: num(p.txns) })),
      lowStock: lowStock.slice(0, 8).map(l => ({ name: l.name, onHand: num(l.on_hand), reorderLevel: num(l.reorder) })),
      lowStockCount: lowStock.length,
      outOfStockCount: lowStock.filter(l => num(l.on_hand) <= 0).length,
      pendingTransfers,
      pendingPOs,
      debts: {
        outstandingMinor: num(debtTotals._sum.amountMinor) - num(debtTotals._sum.paidMinor),
        openCount: debtTotals._count._all,
        overdueCount: overdueDebts,
      },
      recentSales: recent.map(r => ({
        id: r.id,
        receiptNumber: r.receipt?.receiptNumber ?? r.saleNumber,
        totalMinor: num(r.totalMinor),
        items: r._count.items,
        method: r.payments[0]?.method ?? 'CASH',
        completedAt: r.completedAt.toISOString(),
      })),
    };
  }

  /**
   * Sales report for a calendar date range (docs/11, screen `/reports/sales`).
   *
   * `dateFrom`/`dateTo` are calendar dates interpreted in the business timezone (Africa/Kampala)
   * and inclusive at both ends — the same convention as `getDashboard`. Miss or mangle them and
   * the last 30 days are used instead. Only completed sales count; refunds are reported
   * separately in `refundsMinor` and netted into `netMinor`.
   *
   * The response is shaped for the clients that render it (web `SalesReport`, mobile
   * `SalesReportScreen`): minor units under `*Minor`, named branches, and one bucket per
   * day/week/month.
   */
  async getSalesReport(
    businessId: string,
    filters: { branchId?: string; dateFrom: string; dateTo: string; groupBy: 'day' | 'week' | 'month' },
  ) {
    const TZ = 'Africa/Kampala';
    const num = (v: unknown) => Number(v ?? 0);

    const asDate = (value: string | undefined, fallbackDaysAgo: number) => {
      const parsed = value ? new Date(value) : new Date(Number.NaN);
      const at = Number.isNaN(parsed.getTime()) ? new Date(Date.now() - fallbackDaysAgo * 86_400_000) : parsed;
      return at.toISOString().slice(0, 10);
    };
    const dateFrom = asDate(filters.dateFrom, 30);
    const dateTo = asDate(filters.dateTo, 0);
    const groupBy: 'day' | 'week' | 'month' = filters.groupBy === 'week' || filters.groupBy === 'month' ? filters.groupBy : 'day';

    const live = Prisma.sql`s.business_id = ${businessId}::uuid
      AND s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED')
      AND (s.completed_at AT TIME ZONE ${TZ})::date BETWEEN ${dateFrom}::date AND ${dateTo}::date
      ${filters.branchId ? Prisma.sql`AND s.branch_id = ${filters.branchId}::uuid` : Prisma.empty}`;

    const [totals, byDay, byBranch, byPaymentMethod] = await Promise.all([
      this.prisma.$queryRaw<{ gross: bigint; refunds: bigint; txns: bigint }[]>(Prisma.sql`
        SELECT COALESCE(SUM(s.total_minor), 0) AS gross,
               COALESCE(SUM(s.refunded_total_minor), 0) AS refunds,
               COUNT(*) AS txns
        FROM sales s
        WHERE ${live}`),
      this.prisma.$queryRaw<{ d: string; net: bigint; txns: bigint }[]>(Prisma.sql`
        SELECT to_char(date_trunc(${groupBy}, s.completed_at AT TIME ZONE ${TZ}), 'YYYY-MM-DD') AS d,
               COALESCE(SUM(s.total_minor - s.refunded_total_minor), 0) AS net,
               COUNT(*) AS txns
        FROM sales s
        WHERE ${live}
        GROUP BY 1 ORDER BY 1`),
      this.prisma.$queryRaw<{ id: string; name: string; net: bigint; txns: bigint }[]>(Prisma.sql`
        SELECT b.id, b.name,
               COALESCE(SUM(s.total_minor - s.refunded_total_minor), 0) AS net,
               COUNT(*) AS txns
        FROM sales s
        JOIN branches b ON b.id = s.branch_id
        WHERE ${live}
        GROUP BY b.id, b.name
        ORDER BY net DESC`),
      this.prisma.$queryRaw<{ method: string; total: bigint; txns: bigint }[]>(Prisma.sql`
        SELECT pay.method::text AS method,
               COALESCE(SUM(pay.amount_minor), 0) AS total,
               COUNT(*) AS txns
        FROM payments pay
        JOIN sales s ON s.id = pay.sale_id
        WHERE ${live} AND pay.status = 'SUCCEEDED'
        GROUP BY 1 ORDER BY total DESC`),
    ]);

    const total = totals[0] ?? { gross: 0n, refunds: 0n, txns: 0n };
    const grossMinor = num(total.gross);
    const refundsMinor = num(total.refunds);

    return {
      currency: 'UGX',
      dateFrom,
      dateTo,
      groupBy,
      grossMinor,
      refundsMinor,
      netMinor: grossMinor - refundsMinor,
      transactions: num(total.txns),
      byDay: byDay.map(r => ({ date: r.d, netMinor: num(r.net), transactions: num(r.txns) })),
      byBranch: byBranch.map(r => ({ branchId: r.id, branchName: r.name, netMinor: num(r.net), transactions: num(r.txns) })),
      byPaymentMethod: byPaymentMethod.map(r => ({ method: r.method, total: num(r.total), transactions: num(r.txns) })),
    };
  }

  async getStockReport(businessId: string, branchId?: string) {
    const balances = await this.prisma.inventoryBalance.findMany({
      where: { businessId, ...(branchId && { branchId }) },
      include: { variant: { include: { product: { include: { category: true } } } }, branch: true, batch: true },
    });

    const totalValue = balances.reduce((sum, b) => {
      const cost = b.variant.costPriceMinor ?? b.variant.product.costPriceMinor ?? 0n;
      return sum + cost * BigInt(Math.round(Number(b.quantityOnHand)));
    }, 0n);

    return { balances, totalValue, count: balances.length };
  }

  async getLowStockReport(businessId: string, branchId?: string) {
    const balances = await this.prisma.inventoryBalance.findMany({
      where: { businessId, ...(branchId && { branchId }) },
      include: { variant: { include: { product: true } }, branch: true },
    });
    return balances.filter(b => {
      const reorderLevel = Number(b.variant.product.reorderLevel);
      return reorderLevel > 0 && Number(b.quantityOnHand) <= reorderLevel;
    });
  }

  async getPurchasingReport(businessId: string, filters: { supplierId?: string; dateFrom?: string; dateTo?: string }) {
    const where = {
      businessId,
      deletedAt: null,
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.dateFrom || filters.dateTo ? {
        createdAt: {
          ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
          ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
        },
      } : {}),
    };

    const [orderValue, receivedValue, openCount] = await Promise.all([
      this.prisma.purchaseOrder.aggregate({ where, _sum: { totalMinor: true } }),
      this.prisma.purchaseOrder.aggregate({ where: { ...where, status: { in: ['RECEIVED', 'CLOSED'] } }, _sum: { totalMinor: true } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: { in: ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'PARTIALLY_RECEIVED'] } } }),
    ]);

    return {
      orderedValue: orderValue._sum.totalMinor ?? 0n,
      receivedValue: receivedValue._sum.totalMinor ?? 0n,
      openOrderCount: openCount,
    };
  }
}
