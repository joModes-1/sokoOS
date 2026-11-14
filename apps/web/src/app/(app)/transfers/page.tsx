'use client';

import { useState } from 'react';
import { useTransfers, useBranches, useProducts } from '@/hooks/use-queries';
import { formatDate, formatMoney } from '@/lib/format';
import { PageHeader, Button, Badge, Tabs, Spinner, EmptyState, Modal, Select, Input, Alert } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useBusinessContext } from '@/hooks/use-business';
import { statusToTone } from '@/lib/format';
import Link from 'next/link';

export default function TransfersPage() {
  const qc = useQueryClient();
  const { businessId } = useBusinessContext();
  const [tab, setTab] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [items, setItems] = useState<{ variantId: string; qty: number }[]>([{ variantId: '', qty: 1 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = useTransfers({ status: tab || undefined });
  const { data: branches } = useBranches();
  const { data: products } = useProducts({});

  const branchOptions = (branches ?? []).map(b => ({ value: b.id, label: b.name }));
  const variantOptions = (products?.items ?? []).flatMap(p =>
    p.variants.map(v => ({ value: v.id, label: `${p.name}${v.name !== 'Default' ? ` — ${v.name}` : ''}` }))
  );

  async function onSave() {
    if (!origin || !dest || origin === dest) { setError('Origin and destination must be different'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/transfers', {
        originBranchId: origin,
        destinationBranchId: dest,
        items: items
          .filter((item) => item.variantId)
          .map((item) => ({
            productVariantId: item.variantId,
            requestedQuantity: item.qty,
          })),
      });
      qc.invalidateQueries({ queryKey: queryKeys.transfers(businessId) });
      setShowCreate(false);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Failed to create transfer');
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader
        title="Stock Transfers"
        subtitle="Move inventory between branches"
        actions={<Button onClick={() => setShowCreate(true)}>+ New transfer</Button>}
      />

      <div className="mb-5">
        <Tabs
          tabs={[
            { key: '', label: 'All' },
            { key: 'REQUESTED', label: 'Requested' },
            { key: 'APPROVED', label: 'Approved' },
            { key: 'DISPATCHED', label: 'Dispatched' },
            { key: 'RECEIVED', label: 'Received' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items?.length ? (
        <EmptyState icon="🚚" title="No transfers" action={<Button onClick={() => setShowCreate(true)}>Create transfer</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Ref</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">From → To</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Date</th>
                <th className="text-right px-4 py-3 font-semibold text-ink/60">Items</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map(t => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-mono text-xs text-ink/60">{t.transferRef}</td>
                  <td className="px-4 py-3 text-ink">
                    <span className="font-medium">{t.originBranchName}</span>
                    <span className="text-ink/40 mx-1">→</span>
                    <span className="font-medium">{t.destinationBranchName}</span>
                  </td>
                  <td className="px-4 py-3 text-ink/60">{formatDate(t.requestedAt)}</td>
                  <td className="px-4 py-3 text-right text-ink/60">{t.itemCount}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusToTone(t.status)}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/transfers/${t.id}`} className="text-xs text-sunset hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New stock transfer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button loading={saving} onClick={onSave}>Create transfer</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Select label="From branch" options={[{ value: '', label: 'Select…' }, ...branchOptions]} value={origin} onChange={e => setOrigin(e.target.value)} />
            <Select label="To branch" options={[{ value: '', label: 'Select…' }, ...branchOptions]} value={dest} onChange={e => setDest(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-ink/80">Items</p>
              <Button size="sm" variant="ghost" onClick={() => setItems([...items, { variantId: '', qty: 1 }])}>+ Add item</Button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select
                  value={item.variantId}
                  onChange={e => setItems(items.map((it, idx) => idx === i ? { ...it, variantId: e.target.value } : it))}
                  className="form-input flex-1"
                >
                  <option value="">Select product…</option>
                  {variantOptions.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
                <input
                  type="number"
                  value={item.qty}
                  min={1}
                  onChange={e => setItems(items.map((it, idx) => idx === i ? { ...it, qty: parseInt(e.target.value) || 1 } : it))}
                  className="form-input w-16"
                />
                {items.length > 1 && (
                  <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-danger hover:text-red-700 px-1">×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
