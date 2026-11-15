'use client';

import { useLowStock } from '@/hooks/use-queries';
import { formatQuantity } from '@/lib/format';
import { PageHeader, Spinner, EmptyState, Button, Badge } from '@/components/ui';
import Link from 'next/link';

export default function LowStockReportPage() {
  const { data: items, isLoading } = useLowStock();

  return (
    <div>
      <PageHeader
        title="Low Stock Alert"
        subtitle={items?.length ? `${items.length} items need restocking` : ''}
        actions={
          <Link href="/purchasing/purchase-orders">
            <Button>Create purchase order</Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !items?.length ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-ink">All stocked up!</h3>
          <p className="text-sm text-ink/50 mt-1">No items are below their reorder level.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Product</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Branch</th>
                <th className="text-right px-4 py-3 font-semibold text-ink/60">On hand</th>
                <th className="text-right px-4 py-3 font-semibold text-ink/60">Reorder at</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-ink">{item.productName}</td>
                  <td className="px-4 py-3 text-ink/60">{item.branchName}</td>
                  <td className={`px-4 py-3 text-right font-bold ${item.qty <= 0 ? 'text-danger' : 'text-warning'}`}>
                    {formatQuantity(item.qty)}
                  </td>
                  <td className="px-4 py-3 text-right text-ink/50">{formatQuantity(item.reorderQty)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.qty <= 0 ? 'danger' : 'warning'}>
                      {item.qty <= 0 ? 'Out of stock' : 'Low stock'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
