'use client';

import { useState } from 'react';
import { useSales } from '@/hooks/use-queries';
import { formatDate, formatMoney, statusToTone } from '@/lib/format';
import { PageHeader, Tabs, Spinner, EmptyState, Badge } from '@/components/ui';
import Link from 'next/link';

export default function SalesPage() {
  const [tab, setTab] = useState('');
  const { data, isLoading } = useSales({ status: tab || undefined });

  return (
    <div>
      <PageHeader title="Sales" subtitle={data ? `${data.total} transactions` : ''} />

      <div className="mb-5">
        <Tabs
          tabs={[
            { key: '', label: 'All' },
            { key: 'COMPLETED', label: 'Completed' },
            { key: 'REFUNDED', label: 'Refunded' },
            { key: 'PARTIALLY_REFUNDED', label: 'Partial refund' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items?.length ? (
        <EmptyState icon="🧾" title="No sales yet" description="Completed sales will appear here" />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-sand/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Receipt</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Branch</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Payment</th>
                  <th className="text-right px-4 py-3 font-semibold text-ink/60">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map(sale => (
                  <tr key={sale.id} className="border-b border-border/50 hover:bg-sand/30">
                    <td className="px-4 py-3 font-mono text-xs text-ink/60">{sale.receiptNumber}</td>
                    <td className="px-4 py-3 text-ink/60">{sale.branchName}</td>
                    <td className="px-4 py-3 text-ink/60">{sale.customerName ?? 'Walk-in'}</td>
                    <td className="px-4 py-3 text-ink/60 whitespace-nowrap">{formatDate(sale.createdAt, { relative: true })}</td>
                    <td className="px-4 py-3 text-ink/60">{sale.paymentMethod ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{formatMoney(sale.totalMinor)}</td>
                    <td className="px-4 py-3"><Badge tone={statusToTone(sale.status)}>{sale.status}</Badge></td>
                    <td className="px-4 py-3">
                      <Link href={`/sales/${sale.id}`} className="text-xs text-sunset hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
