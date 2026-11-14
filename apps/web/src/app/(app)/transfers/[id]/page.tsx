'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { formatDate, formatQuantity, statusToTone } from '@/lib/format';
import { PageHeader, Badge, Button, Alert, Spinner } from '@/components/ui';
import Link from 'next/link';

interface TransferDetail {
  id: string;
  transferNumber: string;
  status: string;
  requestedAt: string;
  note?: string;
  requestedBy?: string;
  originBranch?: { name?: string } | null;
  destinationBranch?: { name?: string } | null;
  items: {
    id: string;
    requestedQuantity: string | number;
    dispatchedQuantity?: string | number | null;
    receivedQuantity?: string | number | null;
    variant?: {
      variantName?: string | null;
      product?: { name?: string } | null;
    } | null;
  }[];
}

function itemName(item: TransferDetail['items'][number]): string {
  const product = item.variant?.product?.name ?? '';
  const variant = item.variant?.variantName;
  return variant && variant !== 'Default' ? `${product} — ${variant}` : product;
}

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: transfer, isLoading, refetch } = useQuery({
    queryKey: ['transfer', id],
    queryFn: () => api.get<TransferDetail>(`/transfers/${id}`),
    enabled: !!id,
  });

  async function action(act: 'approve' | 'reject' | 'dispatch' | 'receive' | 'close') {
    if (!transfer) return;
    setLoading(true);
    setError('');
    try {
      if (act === 'reject') {
        const reason = window.prompt('Why is this transfer being rejected?');
        if (!reason) {
          setLoading(false);
          return;
        }
        await api.patch(`/transfers/${id}/reject`, { reason });
      } else if (act === 'receive') {
        await api.patch(`/transfers/${id}/receive`, {
          items: transfer.items.map((item) => ({
            transferItemId: item.id,
            receivedQuantity: Number(item.dispatchedQuantity ?? item.requestedQuantity),
          })),
        });
      } else {
        await api.patch(`/transfers/${id}/${act}`, {});
      }
      await refetch();
      router.refresh();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!transfer) return <div className="text-center py-16 text-ink/40">Transfer not found</div>;

  return (
    <div>
      <div className="mb-4">
        <Link href="/transfers" className="text-sm text-sunset hover:underline">← Back to transfers</Link>
      </div>

      <PageHeader
        title={`Transfer ${transfer.transferNumber}`}
        subtitle={`${transfer.originBranch?.name ?? ''} → ${transfer.destinationBranch?.name ?? ''}`}
        actions={
          <Badge tone={statusToTone(transfer.status)} className="text-sm px-3 py-1">
            {transfer.status}
          </Badge>
        }
      />

      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-ink/40 mb-1">Requested by</p>
          <p className="font-semibold text-ink">{transfer.requestedBy ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-ink/40 mb-1">Date</p>
          <p className="font-semibold text-ink">{formatDate(transfer.requestedAt)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-ink/40 mb-1">Items</p>
          <p className="font-semibold text-ink">{transfer.items.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-sand/50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-ink/60">Product</th>
              <th className="text-right px-4 py-3 font-semibold text-ink/60">Requested</th>
              <th className="text-right px-4 py-3 font-semibold text-ink/60">Dispatched</th>
              <th className="text-right px-4 py-3 font-semibold text-ink/60">Received</th>
            </tr>
          </thead>
          <tbody>
            {transfer.items.map((item) => (
              <tr key={item.id} className="border-b border-border/50">
                <td className="px-4 py-3 font-medium text-ink">{itemName(item)}</td>
                <td className="px-4 py-3 text-right text-ink/70">{formatQuantity(Number(item.requestedQuantity))}</td>
                <td className="px-4 py-3 text-right text-ink/70">
                  {item.dispatchedQuantity != null ? formatQuantity(Number(item.dispatchedQuantity)) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-ink/70">
                  {item.receivedQuantity != null ? formatQuantity(Number(item.receivedQuantity)) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        {transfer.status === 'REQUESTED' && (
          <>
            <Button onClick={() => action('approve')} loading={loading}>Approve</Button>
            <Button variant="danger" onClick={() => action('reject')} loading={loading}>Reject</Button>
          </>
        )}
        {transfer.status === 'APPROVED' && (
          <Button onClick={() => action('dispatch')} loading={loading}>Mark as Dispatched</Button>
        )}
        {transfer.status === 'DISPATCHED' && (
          <Button onClick={() => action('receive')} loading={loading}>Mark as Received</Button>
        )}
        {transfer.status === 'RECEIVED' && (
          <Button onClick={() => action('close')} loading={loading}>Close transfer</Button>
        )}
      </div>
    </div>
  );
}
