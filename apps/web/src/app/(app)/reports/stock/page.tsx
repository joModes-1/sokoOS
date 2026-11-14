'use client';

import { useInventoryBalances } from '@/hooks/use-queries';
import { formatMoney, formatQuantity } from '@/lib/format';
import { PageHeader, Spinner, EmptyState, StatCard } from '@/components/ui';

export default function StockReportPage() {
  const { data, isLoading } = useInventoryBalances({});

  const totalItems = data?.total ?? 0;
  const outOfStock = (data?.items ?? []).filter(i => i.qty <= 0).length;
  const lowStock = (data?.items ?? []).filter(i => i.qty > 0 && i.qty <= i.reorderQty).length;

  return (
    <div>
      <PageHeader title="Stock Report" subtitle="Current inventory valuation and status" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Items" value={String(totalItems)} />
        <StatCard label="Low Stock" value={String(lowStock)} />
        <StatCard label="Out of Stock" value={String(outOfStock)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items?.length ? (
        <EmptyState icon="📊" title="No inventory data" />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-sand/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Branch</th>
                  <th className="text-right px-4 py-3 font-semibold text-ink/60">On hand</th>
                  <th className="text-right px-4 py-3 font-semibold text-ink/60">Reorder at</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={i} className={`border-b border-border/50 ${item.qty <= 0 ? 'bg-danger/5' : item.qty <= item.reorderQty ? 'bg-warning/5' : ''}`}>
                    <td className="px-4 py-3 font-medium text-ink">{item.productName}</td>
                    <td className="px-4 py-3 text-ink/60">{item.branchName}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${item.qty <= 0 ? 'text-danger' : item.qty <= item.reorderQty ? 'text-warning' : 'text-ink'}`}>
                      {formatQuantity(item.qty)}
                    </td>
                    <td className="px-4 py-3 text-right text-ink/50">{formatQuantity(item.reorderQty)}</td>
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
