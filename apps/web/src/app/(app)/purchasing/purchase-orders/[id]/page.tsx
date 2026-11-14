'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatMoney, formatQuantity, statusToTone } from '@/lib/format';
import { PageHeader, Badge, Button, Alert, Spinner } from '@/components/ui';
import Link from 'next/link';

interface PODetail {
  id: string;
  poNumber: string;
  status: string;
  totalMinor: string | number;
  supplier?: { name?: string } | null;
  branch?: { name?: string } | null;
  items: {
    id: string;
    quantityOrdered: string | number;
    quantityReceived: string | number;
    unitCostMinor: string | number;
    lineTotalMinor: string | number;
    variant?: {
      variantName?: string | null;
      product?: { name?: string } | null;
    } | null;
  }[];
}

function itemName(item: PODetail['items'][number]): string {
  const product = item.variant?.product?.name ?? '';
  const variant = item.variant?.variantName;
  return variant && variant !== 'Default' ? `${product} — ${variant}` : product;
}

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: po, isLoading, refetch } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => api.get<PODetail>(`/purchasing/purchase-orders/${id}`),
    enabled: !!id,
  });

  async function transition(action: 'submit' | 'confirm' | 'cancel' | 'close') {
    setLoading(true);
    setError('');
    try {
      await api.patch(`/purchasing/purchase-orders/${id}/${action}`, {});
      await refetch();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!po) return <div className="text-center py-16 text-ink/40">PO not found</div>;

  return (
    <div>
      <div className="mb-4">
        <Link href="/purchasing/purchase-orders" className="text-sm text-sunset hover:underline">← Back to POs</Link>
      </div>

      <PageHeader
        title={`PO ${po.poNumber}`}
        subtitle={`Supplier: ${po.supplier?.name ?? '—'} · Branch: ${po.branch?.name ?? '—'}`}
        actions={<Badge tone={statusToTone(po.status)} className="text-sm px-3 py-1">{po.status}</Badge>}
      />

      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}

      <div className="bg-white rounded-xl border border-border overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-sand/50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-ink/60">Product</th>
              <th className="text-right px-4 py-3 font-semibold text-ink/60">Ordered</th>
              <th className="text-right px-4 py-3 font-semibold text-ink/60">Received</th>
              <th className="text-right px-4 py-3 font-semibold text-ink/60">Unit cost</th>
              <th className="text-right px-4 py-3 font-semibold text-ink/60">Total</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item) => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="px-4 py-3 font-medium text-ink">{itemName(item)}</td>
                <td className="px-4 py-3 text-right">{formatQuantity(Number(item.quantityOrdered))}</td>
                <td className="px-4 py-3 text-right">{formatQuantity(Number(item.quantityReceived))}</td>
                <td className="px-4 py-3 text-right">{formatMoney(Number(item.unitCostMinor))}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoney(Number(item.lineTotalMinor))}</td>
              </tr>
            ))}
            <tr className="bg-sand/30">
              <td colSpan={4} className="px-4 py-3 text-right font-semibold text-ink">Total</td>
              <td className="px-4 py-3 text-right font-bold text-sunset text-base">
                {formatMoney(Number(po.totalMinor))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 flex-wrap">
        {po.status === 'DRAFT' && (
          <>
            <Button onClick={() => transition('submit')} loading={loading}>Submit PO</Button>
            <Button variant="danger" onClick={() => transition('cancel')} loading={loading}>Cancel PO</Button>
          </>
        )}
        {po.status === 'SUBMITTED' && (
          <>
            <Button onClick={() => transition('confirm')} loading={loading}>Confirm PO</Button>
            <Button variant="danger" onClick={() => transition('cancel')} loading={loading}>Cancel PO</Button>
          </>
        )}
        {(po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED') && (
          <Button onClick={() => router.push(`/purchasing/goods-receipts?poId=${id}`)}>
            Record Goods Receipt
          </Button>
        )}
        {(po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED') && (
          <Button variant="secondary" onClick={() => transition('close')} loading={loading}>Close PO</Button>
        )}
      </div>
    </div>
  );
}
