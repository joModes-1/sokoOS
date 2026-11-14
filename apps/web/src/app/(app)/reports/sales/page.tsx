'use client';

import { useState } from 'react';
import { useSalesReport } from '@/hooks/use-queries';
import { formatMoney, formatDate } from '@/lib/format';
import { PageHeader, StatCard, Card, Spinner } from '@/components/ui';

export default function SalesReportPage() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(weekAgo);
  const [dateTo, setDateTo] = useState(today);

  const { data: report, isLoading } = useSalesReport({ dateFrom, dateTo });
  const days = report?.byDay ?? [];
  // Bars are sized in pixels: a percentage height resolves against this auto-height column and
  // collapses the chart into a flat line.
  const maxDayMinor = Math.max(...days.map(d => d.netMinor), 1);


  return (
    <div>
      <PageHeader title="Sales Report" />

      {/* Date range filter */}
      <div className="flex gap-3 items-center mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink/60">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink/60">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Gross Sales" value={formatMoney(report?.grossMinor ?? 0, 'UGX', { short: true })} />
            <StatCard label="Refunds" value={formatMoney(report?.refundsMinor ?? 0, 'UGX', { short: true })} />
            <StatCard label="Net Sales" value={formatMoney(report?.netMinor ?? 0, 'UGX', { short: true })} />
            <StatCard label="Transactions" value={String(report?.transactions ?? 0)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By branch */}
            <Card>
              <h2 className="font-semibold text-ink mb-4">Sales by Branch</h2>
              {report?.byBranch?.length ? (
                <div className="space-y-3">
                  {report.byBranch.map((b, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm text-ink">{b.branchName}</span>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">{formatMoney(b.netMinor)}</p>
                        <p className="text-xs text-ink/40">{b.transactions} txns</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink/40 text-center py-6">No data for this period</p>
              )}
            </Card>

            {/* By payment method */}
            <Card>
              <h2 className="font-semibold text-ink mb-4">By Payment Method</h2>
              {report?.byPaymentMethod?.length ? (
                <div className="space-y-3">
                  {report.byPaymentMethod.map((p, i) => {
                    const total = report.byPaymentMethod.reduce((s, x) => s + x.total, 0);
                    const pct = total > 0 ? Math.round((p.total / total) * 100) : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-ink">{p.method}</span>
                          <span className="text-sm font-semibold">{formatMoney(p.total)}</span>
                        </div>
                        <div className="h-1.5 bg-sand rounded-full">
                          <div className="h-full bg-sunset rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-ink/40 text-center py-6">No data for this period</p>
              )}
            </Card>

            {/* Daily trend */}
            {days.length > 0 && (
              <Card className="lg:col-span-2">
                <h2 className="font-semibold text-ink mb-4">Daily Sales Trend</h2>
                <div className="flex items-start gap-1">
                  {days.map((day, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1 group" title={`${formatDate(day.date)}: ${formatMoney(day.netMinor)}`}>
                      {/* Fixed 128px (h-32) plot area so bar heights resolve against a known size */}
                      <div className="flex h-32 w-full items-end">
                        <div
                          className="w-full rounded-t bg-sunset/80 transition-colors group-hover:bg-sunset"
                          style={{ height: Math.max(2, Math.round((day.netMinor / maxDayMinor) * 128)) }}
                        />
                      </div>
                      <span className="text-center text-ink/40" style={{ fontSize: '10px' }}>
                        {Number(day.date.slice(8, 10))}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
