'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/hooks/use-queries';
import { useBusinessContext } from '@/hooks/use-business';
import { getIndustryConfig } from '@/lib/industries';
import { formatMoney, formatDate } from '@/lib/format';
import { Card, Spinner, EmptyState } from '@/components/ui';
import { BarList, CHART, HourChart, Sparkline, TrendChart } from '@/components/charts';

const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', MTN_MOMO: 'MTN MoMo', AIRTEL_MONEY: 'Airtel Money' };
const RANGES = [7, 14, 30] as const;

const money = (n: number) => formatMoney(n, 'UGX', { short: true });
const pctChange = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;

function Delta({ pct, suffix }: { pct: number | null; suffix: string }) {
  if (pct == null) return <span className="text-xs text-ink/40">{suffix}</span>;
  const up = pct >= 0;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ${up ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'}`}>
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
          {up ? <path d="M6 2l4 6H2z" /> : <path d="M6 10L2 4h8z" />}
        </svg>
        {up ? '+' : ''}{pct.toFixed(1)}%
      </span>
      <span className="text-ink/45">{suffix}</span>
    </span>
  );
}

function Kpi({ label, value, children, spark, sparkColor }: {
  label: string; value: string; children?: React.ReactNode; spark?: number[]; sparkColor?: string;
}) {
  return (
    <Card className="flex flex-col justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">{value}</p>
        <div className="mt-1 min-h-[20px]">{children}</div>
      </div>
      {spark && <Sparkline values={spark} color={sparkColor} />}
    </Card>
  );
}

function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-semibold text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-ink/45">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export default function DashboardPage() {
  const { businessName, industryCode } = useBusinessContext();
  const industry = getIndustryConfig(industryCode);
  const { data: d, isLoading, isError, refetch } = useDashboard();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [greeting, setGreeting] = useState('Hello');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  const view = useMemo(() => {
    if (!d) return null;
    const days = d.salesByDay.slice(-range);
    const best = d.salesByDay.reduce((a, b) => (b.revenue > a.revenue ? b : a), d.salesByDay[0]!);
    const peak = d.salesByHour.reduce((a, b) => (b.transactions > a.transactions ? b : a), d.salesByHour[0]!);
    const totalPay = d.payments.reduce((s, p) => s + p.total, 0) || 1;
    return { days, best, peak, totalPay };
  }, [d, range]);

  const quick = (industry.nav ?? []).filter(n => n.path !== '/dashboard').slice(0, 5);
  const hasSales = (d?.kpis.transactionsRange ?? 0) > 0;

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {greeting}{businessName ? `, ${businessName}` : ''}
          </h1>
          <p className="mt-0.5 text-sm text-ink/50">
            {formatDate(new Date())}
            {d && <> · updated {new Date(d.asOf).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}</>}
          </p>
        </div>
        <Link href="/pos" className="inline-flex items-center gap-2 rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sunset-hover">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" /></svg>
          New sale
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      )}

      {isError && (
        <Card>
          <EmptyState
            title="Couldn't load your dashboard"
            description="Check your connection and try again."
            action={<button onClick={() => refetch()} className="rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white">Retry</button>}
          />
        </Card>
      )}

      {d && view && (
        <>
          {/* What's happening */}
          <section
            className="relative mb-6 overflow-hidden rounded-2xl p-6 text-white shadow-sm"
            style={{ background: 'linear-gradient(120deg, #3A2216 0%, #5a2f1a 55%, #9a3a0e 100%)' }}
            aria-label="Summary"
          >
            <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/5" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">What&apos;s happening</p>
            {hasSales ? (
              <>
                <p className="mt-2 font-display text-xl font-bold leading-snug md:text-2xl">
                  {d.kpis.transactionsToday > 0
                    ? <>You&apos;ve made <span className="text-[#ffb98a]">{formatMoney(d.kpis.revenueToday)}</span> from {d.kpis.transactionsToday} sales today.</>
                    : <>No sales yet today — yesterday you made <span className="text-[#ffb98a]">{formatMoney(d.kpis.revenueYesterday)}</span>.</>}
                </p>
                <ul className="mt-4 grid gap-2 text-sm text-white/85 sm:grid-cols-2 xl:grid-cols-4">
                  <li className="rounded-lg bg-white/10 px-3 py-2">
                    <span className="block text-[11px] uppercase tracking-wide text-white/55">Last 7 days</span>
                    {(() => { const p = pctChange(d.kpis.revenue7d, d.kpis.revenuePrev7d); return p == null ? money(d.kpis.revenue7d) : `${money(d.kpis.revenue7d)} (${p >= 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(1)}% vs prior week)`; })()}
                  </li>
                  <li className="rounded-lg bg-white/10 px-3 py-2">
                    <span className="block text-[11px] uppercase tracking-wide text-white/55">Best day</span>
                    {new Date(`${view.best.date}T00:00:00`).toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'short' })} · {money(view.best.revenue)}
                  </li>
                  <li className="rounded-lg bg-white/10 px-3 py-2">
                    <span className="block text-[11px] uppercase tracking-wide text-white/55">Busiest hour</span>
                    {hourLabel(view.peak.hour)} · {view.peak.transactions} sales in {d.rangeDays} days
                  </li>
                  <li className="rounded-lg bg-white/10 px-3 py-2">
                    <span className="block text-[11px] uppercase tracking-wide text-white/55">{d.outOfStockCount > 0 ? 'Needs restocking' : 'Top seller'}</span>
                    {d.outOfStockCount > 0
                      ? `${d.outOfStockCount} out of stock, ${d.lowStockCount - d.outOfStockCount} running low`
                      : `${d.topProducts[0]?.name ?? '—'} · ${money(d.topProducts[0]?.revenue ?? 0)}`}
                  </li>
                </ul>
              </>
            ) : (
              <p className="mt-2 font-display text-xl font-bold">No sales recorded yet. Make your first sale from the Point of Sale and this page will come alive.</p>
            )}
          </section>

          {/* KPIs */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Revenue · last 7 days"
              value={formatMoney(d.kpis.revenue7d)}
              spark={d.salesByDay.slice(-14).map(x => x.revenue)}
              sparkColor={CHART.revenue}
            >
              <Delta pct={pctChange(d.kpis.revenue7d, d.kpis.revenuePrev7d)} suffix="vs previous 7 days" />
            </Kpi>
            <Kpi
              label="Today's sales"
              value={formatMoney(d.kpis.revenueToday)}
              spark={d.salesByDay.slice(-14).map(x => x.transactions)}
              sparkColor={CHART.revenue}
            >
              <span className="text-xs text-ink/50">{d.kpis.transactionsToday} sales · yesterday {money(d.kpis.revenueYesterday)} ({d.kpis.transactionsYesterday})</span>
            </Kpi>
            <Kpi
              label={`Gross profit · ${d.rangeDays} days`}
              value={formatMoney(d.kpis.profitRange)}
              spark={d.salesByDay.slice(-14).map(x => x.profit)}
              sparkColor={CHART.profit}
            >
              <span className="text-xs text-ink/50">
                {d.kpis.revenueRange > 0 ? `${((d.kpis.profitRange / d.kpis.revenueRange) * 100).toFixed(1)}% margin on ${money(d.kpis.revenueRange)}` : 'No sales yet'}
              </span>
            </Kpi>
            <Kpi
              label="Average basket"
              value={formatMoney(d.kpis.avgBasketRange)}
              spark={d.salesByDay.slice(-14).map(x => (x.transactions ? x.revenue / x.transactions : 0))}
              sparkColor={CHART.revenue}
            >
              <span className="text-xs text-ink/50">{d.kpis.transactionsRange.toLocaleString('en-UG')} sales in {d.rangeDays} days</span>
            </Kpi>
          </div>

          {/* Customer credit: what people still owe from goods taken on debt */}
          <Card className="mb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-ink">Debts owed to you</h2>
                <p className="mt-0.5 text-xs text-ink/45">Goods customers took on credit, still being paid off a little at a time</p>
                <p className="mt-3 font-display text-2xl font-bold tabular-nums text-ink">{formatMoney(d.debts.outstandingMinor)}</p>
                <p className="text-xs text-ink/45">
                  {d.debts.openCount === 0
                    ? 'Nothing outstanding — well done.'
                    : `${d.debts.openCount} unpaid debt${d.debts.openCount === 1 ? '' : 's'}`}
                  {d.debts.overdueCount > 0 && (
                    <span className="font-semibold text-danger-dark"> · {d.debts.overdueCount} overdue</span>
                  )}
                </p>
              </div>
              <Link
                href="/debts"
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                  d.debts.outstandingMinor > 0
                    ? 'bg-sunset text-white hover:bg-sunset-hover'
                    : 'border border-border bg-white text-ink hover:bg-sand'
                }`}
              >
                {d.debts.outstandingMinor > 0 ? 'Follow up on debts' : 'Open debts'}
              </Link>
            </div>
          </Card>

          {/* Trend + hours */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <SectionTitle
                title="Sales trend"
                hint="Revenue and gross profit per day"
                action={
                  <div className="inline-flex rounded-lg bg-sand p-0.5 text-xs font-medium" role="tablist" aria-label="Date range">
                    {RANGES.map(r => (
                      <button
                        key={r}
                        role="tab"
                        aria-selected={range === r}
                        onClick={() => setRange(r)}
                        className={`rounded-md px-3 py-1.5 transition-colors ${range === r ? 'bg-white text-ink shadow-sm' : 'text-ink/55 hover:text-ink'}`}
                      >
                        {r}D
                      </button>
                    ))}
                  </div>
                }
              />
              <TrendChart data={view.days} />
            </Card>
            <Card>
              <SectionTitle title="Busiest hours" hint={`Sales by hour of day, last ${d.rangeDays} days`} />
              <HourChart data={d.salesByHour} />
              <p className="mt-3 rounded-lg bg-sand px-3 py-2 text-xs text-ink/70">
                Peak is <strong className="text-ink">{hourLabel(view.peak.hour)}</strong>. Staff up around then and keep the fast movers stocked.
              </p>
            </Card>
          </div>

          {/* Breakdowns */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <SectionTitle title="Top products" hint={`By revenue, last ${d.rangeDays} days`} action={<Link href="/reports/sales" className="text-xs text-sunset hover:underline">Report →</Link>} />
              {d.topProducts.length ? (
                <BarList
                  color={CHART.revenue}
                  items={d.topProducts.map(p => ({ label: p.name, value: p.revenue, note: `${Math.round(p.qty)} sold` }))}
                />
              ) : <EmptyState title="No sales yet" />}
            </Card>
            <Card>
              <SectionTitle title="Sales by category" hint="Where the money comes from" />
              {d.categories.length ? (
                <BarList
                  color={CHART.mix}
                  items={d.categories.slice(0, 6).map(c => ({ label: c.name, value: c.revenue, note: `${Math.round((c.revenue / (d.kpis.revenueRange || 1)) * 100)}%` }))}
                />
              ) : <EmptyState title="No sales yet" />}
            </Card>
            <Card>
              <SectionTitle title="How customers pay" hint="Share of revenue by method" action={<Link href="/finance/payments" className="text-xs text-sunset hover:underline">Payments →</Link>} />
              {d.payments.length ? (
                <BarList
                  color={CHART.mix}
                  items={d.payments.map(p => ({
                    label: METHOD_LABEL[p.method] ?? p.method,
                    value: p.total,
                    note: `${Math.round((p.total / view.totalPay) * 100)}%`,
                  }))}
                />
              ) : <EmptyState title="No payments yet" />}
            </Card>
          </div>

          {/* Stock + recent + attention */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <SectionTitle
                title="Stock to reorder"
                hint={d.lowStockCount ? `${d.lowStockCount} item${d.lowStockCount > 1 ? 's' : ''} at or below reorder level` : undefined}
                action={<Link href="/inventory/balances" className="text-xs text-sunset hover:underline">Inventory →</Link>}
              />
              {d.lowStock.length ? (
                <ul className="space-y-3">
                  {d.lowStock.map(s => {
                    const out = s.onHand <= 0;
                    const pct = s.reorderLevel > 0 ? Math.min((s.onHand / s.reorderLevel) * 100, 100) : 0;
                    return (
                      <li key={s.name}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate text-ink">{s.name}</span>
                          <span className="flex flex-shrink-0 items-center gap-2">
                            <span className="tabular-nums text-ink/60">{Math.round(s.onHand)} / {s.reorderLevel}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${out ? 'bg-danger-light text-danger-dark' : 'bg-warning-light text-warning-dark'}`}>
                              {out ? '⛔ Out' : '⚠ Low'}
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-sand-dark">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(pct, out ? 0 : 4)}%`, background: out ? '#DC2626' : '#D97706' }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon="✅" title="Stock looks healthy" description="Nothing is below its reorder level." />
              )}
            </Card>

            <Card>
              <SectionTitle title="Recent sales" action={<Link href="/sales" className="text-xs text-sunset hover:underline">All sales →</Link>} />
              {d.recentSales.length ? (
                <ul className="divide-y divide-border">
                  {d.recentSales.map(s => (
                    <li key={s.id}>
                      <Link href={`/sales/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-sand/60 -mx-2 px-2 rounded-lg">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{s.receiptNumber}</p>
                          <p className="text-xs text-ink/45">
                            {new Date(s.completedAt).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {s.items} item{s.items > 1 ? 's' : ''} · {METHOD_LABEL[s.method] ?? s.method}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-ink">{formatMoney(s.totalMinor)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="No sales yet" />}
            </Card>

            <Card>
              <SectionTitle title="Needs your attention" />
              <ul className="space-y-2">
                {[
                  { label: 'Out of stock', value: d.outOfStockCount, href: '/inventory', warn: d.outOfStockCount > 0 },
                  { label: 'Running low', value: Math.max(d.lowStockCount - d.outOfStockCount, 0), href: '/inventory', warn: d.lowStockCount - d.outOfStockCount > 0 },
                  { label: 'Pending transfers', value: d.pendingTransfers, href: '/transfers', warn: d.pendingTransfers > 0 },
                  { label: 'Purchase orders awaiting', value: d.pendingPOs, href: '/purchasing', warn: d.pendingPOs > 0 },
                  { label: 'Debts overdue', value: d.debts.overdueCount, href: '/debts', warn: d.debts.overdueCount > 0 },
                ].map(row => (
                  <li key={row.label}>
                    <Link href={row.href} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:border-ochre hover:bg-sand/60">
                      <span className="text-ink">{row.label}</span>
                      <span className={`min-w-[1.75rem] rounded-full px-2 py-0.5 text-center text-xs font-bold ${row.warn ? 'bg-warning-light text-warning-dark' : 'bg-sand-dark text-ink/50'}`}>
                        {row.value}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {quick.length > 0 && (
                <>
                  <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-ink/45">Quick actions</p>
                  <div className="flex flex-wrap gap-2">
                    {quick.map(item => (
                      <Link
                        key={item.path}
                        href={item.path as never}
                        className="inline-flex items-center rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ochre hover:bg-peach"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
