'use client';

import { useState } from 'react';
import { useStockBatches } from '@/hooks/use-queries';
import { formatDate, formatQuantity, formatMoney } from '@/lib/format';
import { PageHeader, Spinner, EmptyState, Badge, Tabs } from '@/components/ui';

function batchStatusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'EXPIRING_SOON') return 'warning';
  if (status === 'EXPIRED') return 'danger';
  return 'neutral';
}

export default function BatchesPage() {
  const [tab, setTab] = useState('active');
  const { data: batches, isLoading } = useStockBatches({ expired: tab === 'expired' });

  const filtered = (batches ?? []).filter(b => {
    if (tab === 'active') return b.status === 'ACTIVE' || b.status === 'EXPIRING_SOON';
    if (tab === 'expired') return b.status === 'EXPIRED';
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Stock Batches"
        subtitle="Track batches for expiry management (FEFO)"
      />

      <div className="mb-5">
        <Tabs
          tabs={[{ key: 'active', label: 'Active' }, { key: 'expired', label: 'Expired' }, { key: 'all', label: 'All' }]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !filtered.length ? (
        <EmptyState icon="📦" title="No batches found" description="Batches are created when goods are received" />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-sand/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Batch Ref</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Branch</th>
                  <th className="text-right px-4 py-3 font-semibold text-ink/60">Qty</th>
                  <th className="text-right px-4 py-3 font-semibold text-ink/60">Unit Cost</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Expires</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(batch => (
                  <tr key={batch.id} className="border-b border-border/50 hover:bg-sand/30">
                    <td className="px-4 py-3 font-mono text-xs text-ink/60">{batch.batchRef}</td>
                    <td className="px-4 py-3 font-medium text-ink">{batch.variantName}</td>
                    <td className="px-4 py-3 text-ink/60">{batch.branchName}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{formatQuantity(batch.qty)}</td>
                    <td className="px-4 py-3 text-right text-ink/60">{formatMoney(batch.costMinor)}</td>
                    <td className="px-4 py-3 text-ink/60">
                      {batch.expiresAt ? formatDate(batch.expiresAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={batchStatusTone(batch.status)}>{batch.status}</Badge>
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
