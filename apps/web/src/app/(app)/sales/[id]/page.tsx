'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatDate, formatMoney, formatQuantity, statusToTone } from '@/lib/format';
import { PageHeader, Badge, Button, Alert, Spinner } from '@/components/ui';
import Link from 'next/link';

interface SaleDetail {
  id: string;
  saleNumber: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  subtotalMinor: string | number;
  discountMinor: string | number;
  taxMinor: string | number;
  totalMinor: string | number;
  refundedTotalMinor: string | number;
  branch?: { name?: string } | null;
  customer?: { name?: string } | null;
  receipt?: { receiptNumber?: string } | null;
  payments: { method: string; amountMinor: string | number; status: string }[];
  refunds?: { status: string; items: { saleItemId: string; quantity: string | number }[] }[];
  items: {
    id: string;
    quantity: string | number;
    unitPriceMinor: string | number;
    lineTotalMinor: string | number;
    variant?: {
      variantName?: string | null;
      product?: { name?: string } | null;
    } | null;
  }[];
}

function itemName(item: SaleDetail['items'][number]): string {
  const product = item.variant?.product?.name ?? '';
  const variant = item.variant?.variantName;
  return variant && variant !== 'Default' ? `${product} — ${variant}` : product;
}

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');

  const { data: sale, isLoading, refetch } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => api.get<SaleDetail>(`/sales/${id}`),
    enabled: !!id,
  });

  function refundedQuantity(saleItemId: string): number {
    return (sale?.refunds ?? [])
      .filter((refund) => refund.status === 'COMPLETED')
      .flatMap((refund) => refund.items)
      .filter((item) => item.saleItemId === saleItemId)
      .reduce((sum, item) => sum + Number(item.quantity), 0);
  }

  async function refund() {
    if (!sale) return;
    const items = sale.items
      .map((item) => ({
        saleItemId: item.id,
        quantity: Number(item.quantity) - refundedQuantity(item.id),
        restock: true,
      }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      setRefundError('There is nothing left to refund on this sale.');
      return;
    }

    setRefunding(true);
    setRefundError('');
    try {
      await api.post(`/sales/${id}/refunds`, {
        reasonCode: 'CUSTOMER_REQUEST',
        items,
      });
      await refetch();
    } catch (e: unknown) {
      setRefundError((e as { message?: string })?.message ?? 'Refund failed');
    } finally {
      setRefunding(false);
    }
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!sale) return <div className="text-center py-16 text-ink/40">Sale not found</div>;

  const canRefund = sale.status === 'COMPLETED' || sale.status === 'PARTIALLY_REFUNDED';

  return (
    <div>
      <div className="mb-4">
        <Link href="/sales" className="text-sm text-sunset hover:underline">← Back to sales</Link>
      </div>

      <PageHeader
        title={`Receipt #${sale.receipt?.receiptNumber ?? sale.saleNumber}`}
        subtitle={`${sale.branch?.name ?? ''} · ${sale.customer?.name ?? 'Walk-in customer'}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={statusToTone(sale.status)}>{sale.status}</Badge>
            <Button size="sm" variant="secondary" onClick={() => window.open(`/print/receipts/${id}`, '_blank')}>
              Print
            </Button>
          </div>
        }
      />

      {refundError && <Alert tone="danger" className="mb-4">{refundError}</Alert>}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-ink/40 mb-1">Date &amp; time</p>
          <p className="font-semibold text-ink">{formatDate(sale.completedAt ?? sale.createdAt)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-ink/40 mb-1">Total</p>
          <p className="font-bold text-sunset text-lg font-display">{formatMoney(Number(sale.totalMinor))}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-ink/40 mb-1">Payment</p>
          <p className="font-semibold text-ink">{sale.payments[0]?.method ?? '—'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-sand/50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-ink/60">Item</th>
              <th className="text-right px-4 py-3 font-semibold text-ink/60">Qty</th>
              <th className="text-right px-4 py-3 font-semibold text-ink/60">Unit price</th>
              <th className="text-right px-4 py-3 font-semibold text-ink/60">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="px-4 py-3 font-medium text-ink">{itemName(item)}</td>
                <td className="px-4 py-3 text-right">{formatQuantity(Number(item.quantity))}</td>
                <td className="px-4 py-3 text-right">{formatMoney(Number(item.unitPriceMinor))}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoney(Number(item.lineTotalMinor))}</td>
              </tr>
            ))}
            {Number(sale.discountMinor) > 0 && (
              <tr className="border-b border-border/50">
                <td colSpan={3} className="px-4 py-2 text-right text-ink/60">Discount</td>
                <td className="px-4 py-2 text-right text-success">-{formatMoney(Number(sale.discountMinor))}</td>
              </tr>
            )}
            {Number(sale.taxMinor) > 0 && (
              <tr className="border-b border-border/50">
                <td colSpan={3} className="px-4 py-2 text-right text-ink/60">Tax</td>
                <td className="px-4 py-2 text-right">{formatMoney(Number(sale.taxMinor))}</td>
              </tr>
            )}
            <tr className="bg-sand/30">
              <td colSpan={3} className="px-4 py-3 text-right font-semibold text-ink">Total</td>
              <td className="px-4 py-3 text-right font-bold text-sunset text-base">
                {formatMoney(Number(sale.totalMinor))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {canRefund && (
        <Button variant="secondary" onClick={refund} loading={refunding}>Issue refund</Button>
      )}
    </div>
  );
}
