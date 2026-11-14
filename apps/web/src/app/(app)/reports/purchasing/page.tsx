'use client';

import { usePurchaseOrders, useSuppliers } from '@/hooks/use-queries';
import { formatMoney, formatDate } from '@/lib/format';
import { PageHeader, StatCard, Spinner } from '@/components/ui';

export default function PurchasingReportPage() {
  const { data: pos } = usePurchaseOrders({});
  const { data: suppliers } = useSuppliers();

  const totalSpend = (pos?.items ?? []).reduce((s, p) => s + p.totalMinor, 0);
  const confirmedOrders = (pos?.items ?? []).filter(p => ['CONFIRMED', 'CLOSED'].includes(p.status)).length;

  return (
    <div>
      <PageHeader title="Purchasing Report" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total POs" value={String(pos?.total ?? 0)} />
        <StatCard label="Confirmed Orders" value={String(confirmedOrders)} />
        <StatCard label="Total Spend" value={formatMoney(totalSpend, 'UGX', { short: true })} />
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-ink">Recent Purchase Orders</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-sand/50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-ink/60">PO</th>
              <th className="text-left px-4 py-3 font-semibold text-ink/60">Supplier</th>
              <th className="text-left px-4 py-3 font-semibold text-ink/60">Date</th>
              <th className="text-right px-4 py-3 font-semibold text-ink/60">Total</th>
            </tr>
          </thead>
          <tbody>
            {(pos?.items ?? []).slice(0, 20).map(po => (
              <tr key={po.id} className="border-b border-border/50">
                <td className="px-4 py-3 font-mono text-xs text-ink/60">{po.poNumber}</td>
                <td className="px-4 py-3 font-medium text-ink">{po.supplierName}</td>
                <td className="px-4 py-3 text-ink/60">{formatDate(po.createdAt)}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink">{formatMoney(po.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
