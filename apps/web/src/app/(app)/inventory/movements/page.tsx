'use client';

import { useState } from 'react';
import { useStockMovements } from '@/hooks/use-queries';
import { formatDate, formatQuantity } from '@/lib/format';
import { PageHeader, SearchInput, Spinner, EmptyState, Badge, Select } from '@/components/ui';

const MOVEMENT_TYPES = [
  { value: '', label: 'All types' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'SALE', label: 'Sale' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'TRANSFER_IN', label: 'Transfer In' },
  { value: 'TRANSFER_OUT', label: 'Transfer Out' },
  { value: 'WRITE_OFF', label: 'Write Off' },
  { value: 'OPENING_STOCK', label: 'Opening Stock' },
];

function typeTone(type: string): 'success' | 'danger' | 'info' | 'neutral' {
  if (['PURCHASE', 'TRANSFER_IN', 'OPENING_STOCK'].includes(type)) return 'success';
  if (['SALE', 'TRANSFER_OUT', 'WRITE_OFF'].includes(type)) return 'danger';
  if (type === 'ADJUSTMENT') return 'info';
  return 'neutral';
}

export default function MovementsPage() {
  const [type, setType] = useState('');
  const { data, isLoading } = useStockMovements({ type: type || undefined });

  return (
    <div>
      <PageHeader title="Stock Movements" subtitle="Append-only ledger of all inventory changes" />

      <div className="flex gap-3 mb-5">
        <Select options={MOVEMENT_TYPES} value={type} onChange={e => setType(e.target.value)} className="w-48" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items?.length ? (
        <EmptyState icon="📋" title="No movements yet" description="Stock movements are recorded automatically" />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-sand/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Branch</th>
                  <th className="text-right px-4 py-3 font-semibold text-ink/60">Qty</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">By</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(m => (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-sand/30">
                    <td className="px-4 py-3 text-ink/60 whitespace-nowrap">{formatDate(m.createdAt, { relative: true })}</td>
                    <td className="px-4 py-3">
                      <Badge tone={typeTone(m.type)}>{m.type.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{m.variantName}</td>
                    <td className="px-4 py-3 text-ink/60">{m.branchName}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${m.qty > 0 ? 'text-success' : 'text-danger'}`}>
                      {m.qty > 0 ? '+' : ''}{formatQuantity(m.qty)}
                    </td>
                    <td className="px-4 py-3 text-ink/50">{m.actorName}</td>
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
