import { ReportsService } from '../reports.service.js';

/**
 * Regression cover for the sales report contract.
 *
 * The web `SalesReport` page and the mobile `SalesReportScreen` both read `grossMinor`,
 * `byBranch[].branchName/netMinor` and `byPaymentMethod[].total`. The service previously returned
 * raw Prisma `groupBy` rows, so every money value rendered as `UGX NaN` or `UGX 0` — these tests
 * pin the shape down so that cannot come back.
 */
describe('ReportsService.getSalesReport', () => {
  let queryRaw: jest.Mock;
  let service: ReportsService;

  const rows = {
    totals: [{ gross: 12_500n, refunds: 500n, txns: 7n }],
    byDay: [{ d: '2026-11-05', net: 12_000n, txns: 7n }],
    byBranch: [{ id: 'branch-1', name: 'Kampala Main', net: 12_000n, txns: 7n }],
    byPaymentMethod: [{ method: 'CASH', total: 12_500n, txns: 7n }],
  };

  beforeEach(() => {
    queryRaw = jest.fn(async (query: { sql: string }) => {
      if (query.sql.includes('AS gross')) return rows.totals;
      if (query.sql.includes('AS d')) return rows.byDay;
      if (query.sql.includes('JOIN branches')) return rows.byBranch;
      return rows.byPaymentMethod;
    });
    service = new ReportsService({ $queryRaw: queryRaw } as never);
  });

  it('returns the key names and numeric minor units the clients render', async () => {
    const report = await service.getSalesReport('biz-1', {
      dateFrom: '2026-11-05',
      dateTo: '2026-11-12',
      groupBy: 'day',
    });

    expect(report).toMatchObject({
      grossMinor: 12_500,
      refundsMinor: 500,
      netMinor: 12_000,
      transactions: 7,
      byBranch: [{ branchName: 'Kampala Main', netMinor: 12_000, transactions: 7 }],
      byPaymentMethod: [{ method: 'CASH', total: 12_500 }],
      byDay: [{ date: '2026-11-05', netMinor: 12_000 }],
    });

    // Every money figure the UI formats must be a real number — never NaN.
    const money = [
      report.grossMinor,
      report.refundsMinor,
      report.netMinor,
      ...report.byBranch.map(b => b.netMinor),
      ...report.byPaymentMethod.map(p => p.total),
      ...report.byDay.map(d => d.netMinor),
    ];
    expect(money.every(Number.isFinite)).toBe(true);
    expect(report.netMinor).toBe(report.grossMinor - report.refundsMinor);
  });

  it('scopes every aggregate to the business and the Kampala-local date range', async () => {
    const report = await service.getSalesReport('biz-9', {
      dateFrom: '2026-01-01',
      dateTo: '2026-03-31',
      groupBy: 'month',
    });

    expect(queryRaw).toHaveBeenCalledTimes(4);
    for (const [query] of queryRaw.mock.calls as [{ sql: string; values: unknown[] }][]) {
      // date bucketing happens in the business timezone, and every value is parameterised
      expect(query.sql).toContain('AT TIME ZONE ?');
      expect(query.values).toContain('Africa/Kampala');
      expect(query.values).toContain('biz-9');
      expect(query.values).toContain('2026-01-01');
      expect(query.values).toContain('2026-03-31');
    }
    expect(queryRaw.mock.calls[1]![0].values).toContain('month');
    expect(report.groupBy).toBe('month');
  });

  it('clamps an unknown groupBy to day', async () => {
    const report = await service.getSalesReport('biz-1', {
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      groupBy: 'quarter' as never,
    });

    expect(report.groupBy).toBe('day');
    expect(queryRaw.mock.calls[1]![0].values).toContain('day');
  });

  it('falls back to the last 30 days for missing or unparseable dates instead of throwing', async () => {
    const report = await service.getSalesReport('biz-1', {
      dateFrom: 'not-a-date',
      dateTo: '',
      groupBy: 'day',
    });

    expect(report.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(report.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(report.dateFrom <= report.dateTo).toBe(true);
    expect(queryRaw.mock.calls[0]![0].values).toContain(report.dateFrom);
    expect(queryRaw.mock.calls[0]![0].values).toContain(report.dateTo);
  });
});

describe('ReportsService.getActivityReport', () => {
  let queryRaw: jest.Mock;
  let service: ReportsService;

  const rows = {
    totals: [{ events: 120n, actors: 5n, logins: 40n, failed_logins: 3n }],
    byDay: [{ d: '2026-11-10', count: 12n }],
    topActors: [{ name: 'Ada Admin', email: 'ada@example.com', role: 'BUSINESS_ADMIN', count: 60n }],
    actions: [{ action: 'sales.sale.create', count: 30n }],
    failed: [{ actor_name: 'Ada Admin', ip_address: '41.0.0.1', created_at: new Date('2026-11-10T09:00:00Z') }],
  };

  beforeEach(() => {
    queryRaw = jest.fn(async (query: { sql: string }) => {
      if (query.sql.includes('AS events')) return rows.totals;
      if (query.sql.includes('to_char')) return rows.byDay;
      if (query.sql.includes('u.full_name AS name')) return rows.topActors;
      if (query.sql.includes('GROUP BY l.action')) return rows.actions;
      return rows.failed;
    });
    service = new ReportsService({ $queryRaw: queryRaw } as never);
  });

  it('summarises admin activity with real numbers and named actors', async () => {
    const report = await service.getActivityReport('biz-1', { dateFrom: '2026-11-01', dateTo: '2026-11-10' });

    expect(report).toMatchObject({
      totals: { events: 120, activeUsers: 5, logins: 40, failedLogins: 3 },
      eventsByDay: [{ date: '2026-11-10', count: 12 }],
      topActors: [{ name: 'Ada Admin', email: 'ada@example.com', role: 'BUSINESS_ADMIN', count: 60 }],
      actions: [{ action: 'sales.sale.create', count: 30 }],
      recentFailedLogins: [{ actorName: 'Ada Admin', ipAddress: '41.0.0.1' }],
    });
  });

  it('scopes every aggregate to the business and parameterises the range', async () => {
    await service.getActivityReport('biz-7', { dateFrom: '2026-11-01', dateTo: '2026-11-10' });

    for (const [query] of queryRaw.mock.calls as [{ sql: string; values: unknown[] }][]) {
      expect(query.values).toContain('biz-7');
      expect(query.values).toContain('2026-11-01');
      expect(query.values).toContain('2026-11-10');
      expect(query.values).toContain('Africa/Kampala');
    }
  });

  it('falls back to the last 30 days when no range is given', async () => {
    const report = await service.getActivityReport('biz-1', {});

    expect(report.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(report.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(report.dateFrom <= report.dateTo).toBe(true);
  });
});
