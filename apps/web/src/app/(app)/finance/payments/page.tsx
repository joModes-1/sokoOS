'use client';

import { useSales } from '@/hooks/use-queries';
import { formatMoney, formatDate } from '@/lib/format';
import { PageHeader, Spinner, EmptyState, Badge } from '@/components/ui';

export default function PaymentsPage() {
  const { data, isLoading } = useSales({});

  return (
    <div>
      <PageHeader title="Payments" subtitle="All payment transactions" />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items?.length ? (
        <EmptyState icon="💳" title="No payments recorded" />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Receipt</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Method</th>
                <th className="text-right px-4 py-3 font-semibold text-ink/60">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(sale => (
                <tr key={sale.id} className="border-b border-border/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-mono text-xs text-ink/60">{sale.receiptNumber}</td>
                  <td className="px-4 py-3 text-ink/60">{formatDate(sale.createdAt, { relative: true })}</td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{sale.paymentMethod ?? 'CASH'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{formatMoney(sale.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
