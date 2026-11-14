'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatQuantity } from '@/lib/format';
import { PageHeader, Button, Alert, Spinner } from '@/components/ui';
import Link from 'next/link';

interface PODetail {
  id: string;
  poNumber: string;
  supplier?: { name?: string } | null;
  branch?: { name?: string } | null;
  items: {
    id: string;
    productVariantId: string;
    quantityOrdered: string | number;
    quantityReceived: string | number;
    unitCostMinor: string | number;
    variant?: {
      variantName?: string | null;
      product?: { name?: string } | null;
    } | null;
  }[];
}

function variantLabel(item: PODetail['items'][number]): string {
  const product = item.variant?.product?.name ?? '';
  const variant = item.variant?.variantName;
  return variant && variant !== 'Default' ? `${product} — ${variant}` : product;
}

function GoodsReceiptsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const poId = params.get('poId') ?? '';
  const [batchRefs, setBatchRefs] = useState<Record<string, string>>({});
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: po, isLoading } = useQuery({
    queryKey: ['po-for-receipt', poId],
    queryFn: () => api.get<PODetail>(`/purchasing/purchase-orders/${poId}`),
    enabled: !!poId,
  });

  async function onSave() {
    if (!po) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/purchasing/goods-receipts', {
        purchaseOrderId: poId,
        items: po.items.map((item) => ({
          purchaseOrderItemId: item.id,
          productVariantId: item.productVariantId,
          quantityReceived: receivedQtys[item.id] ?? remaining(item),
          unitCostMinor: Number(item.unitCostMinor),
          ...(batchRefs[item.id] ? { batchNumber: batchRefs[item.id] } : {}),
          ...(expiryDates[item.id] ? { expiryDate: expiryDates[item.id] } : {}),
        })),
      });
      router.push(`/purchasing/purchase-orders/${poId}`);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Failed to record receipt');
    }
    setSaving(false);
  }

  function remaining(item: PODetail['items'][number]): number {
    return Math.max(0, Number(item.quantityOrdered) - Number(item.quantityReceived));
  }

  if (!poId) {
    return (
      <div>
        <PageHeader title="Goods Receipts" />
        <div className="text-center py-16 text-ink/40">
          <p>Open a purchase order and click &quot;Record Goods Receipt&quot;</p>
          <Link href="/purchasing/purchase-orders" className="text-sunset hover:underline mt-2 block">
            Go to purchase orders →
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!po) return <div className="text-center py-16 text-ink/40">PO not found</div>;

  return (
    <div>
      <div className="mb-4">
        <Link href={`/purchasing/purchase-orders/${poId}`} className="text-sm text-sunset hover:underline">
          ← Back to PO {po.poNumber}
        </Link>
      </div>

      <PageHeader
        title="Record Goods Receipt"
        subtitle={`PO ${po.poNumber} · ${po.supplier?.name ?? ''}`}
      />

      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}

      <div className="bg-white rounded-xl border border-border overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Product</th>
                <th className="text-right px-4 py-3 font-semibold text-ink/60">Ordered</th>
                <th className="text-right px-4 py-3 font-semibold text-ink/60">Outstanding</th>
                <th className="text-right px-4 py-3 font-semibold text-ink/60">Received qty</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Batch ref</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Expiry date</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="px-4 py-3 font-medium text-ink">{variantLabel(item)}</td>
                  <td className="px-4 py-3 text-right text-ink/60">{formatQuantity(Number(item.quantityOrdered))}</td>
                  <td className="px-4 py-3 text-right text-ink/60">{formatQuantity(remaining(item))}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      max={remaining(item)}
                      value={receivedQtys[item.id] ?? remaining(item)}
                      onChange={(e) =>
                        setReceivedQtys({
                          ...receivedQtys,
                          [item.id]: Math.max(0, Math.min(remaining(item), parseInt(e.target.value, 10) || 0)),
                        })
                      }
                      className="form-input w-20 text-right"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={batchRefs[item.id] ?? ''}
                      onChange={(e) => setBatchRefs({ ...batchRefs, [item.id]: e.target.value })}
                      placeholder="BATCH-001"
                      className="form-input w-32"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={expiryDates[item.id] ?? ''}
                      onChange={(e) => setExpiryDates({ ...expiryDates, [item.id]: e.target.value })}
                      className="form-input"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href={`/purchasing/purchase-orders/${poId}`}>
          <Button variant="secondary">Cancel</Button>
        </Link>
        <Button loading={saving} onClick={onSave}>Record receipt</Button>
      </div>
    </div>
  );
}

export default function GoodsReceiptsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}>
      <GoodsReceiptsContent />
    </Suspense>
  );
}
