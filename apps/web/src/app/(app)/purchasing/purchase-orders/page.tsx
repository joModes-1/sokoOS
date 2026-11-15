'use client';

import { useState } from 'react';
import { usePurchaseOrders, useSuppliers, useBranches, useProducts } from '@/hooks/use-queries';
import { formatDate, formatMoney, statusToTone } from '@/lib/format';
import { PageHeader, Button, Badge, Tabs, Spinner, EmptyState, Modal, Select, Input, Alert } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useBusinessContext } from '@/hooks/use-business';
import Link from 'next/link';

export default function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const { businessId, branchId } = useBusinessContext();
  const [tab, setTab] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(branchId ?? '');
  const [items, setItems] = useState<{ variantId: string; qty: number; unitCostMinor: number }[]>([
    { variantId: '', qty: 1, unitCostMinor: 0 }
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading } = usePurchaseOrders({ status: tab || undefined });
  const { data: suppliers } = useSuppliers();
  const { data: branches } = useBranches();
  const { data: products } = useProducts({});

  const supplierOptions = (suppliers ?? []).map(s => ({ value: s.id, label: s.name }));
  const branchOptions = (branches ?? []).map(b => ({ value: b.id, label: b.name }));
  const variantOptions = (products?.items ?? []).flatMap(p =>
    p.variants.map(v => ({ value: v.id, label: `${p.name}${v.name !== 'Default' ? ` — ${v.name}` : ''}` }))
  );

  async function onSave() {
    if (!supplierId) { setError('Select a supplier'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/purchasing/purchase-orders', {
        supplierId,
        branchId: selectedBranch,
        items: items.filter(i => i.variantId).map(i => ({
          productVariantId: i.variantId,
          quantityOrdered: i.qty,
          unitCostMinor: Math.round(i.unitCostMinor),
        })),
      });
      qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders(businessId) });
      setShowCreate(false);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Failed to create PO');
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        actions={<Button onClick={() => setShowCreate(true)}>+ New PO</Button>}
      />

      <div className="mb-5">
        <Tabs
          tabs={[
            { key: '', label: 'All' },
            { key: 'DRAFT', label: 'Draft' },
            { key: 'SUBMITTED', label: 'Submitted' },
            { key: 'CONFIRMED', label: 'Confirmed' },
            { key: 'CLOSED', label: 'Closed' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items?.length ? (
        <EmptyState icon="📋" title="No purchase orders" action={<Button onClick={() => setShowCreate(true)}>Create PO</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">PO Number</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Supplier</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Branch</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Date</th>
                <th className="text-right px-4 py-3 font-semibold text-ink/60">Total</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map(po => (
                <tr key={po.id} className="border-b border-border/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-mono text-xs text-ink/60">{po.poNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{po.supplierName}</td>
                  <td className="px-4 py-3 text-ink/60">{po.branchName}</td>
                  <td className="px-4 py-3 text-ink/60">{formatDate(po.createdAt)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{formatMoney(po.totalMinor)}</td>
                  <td className="px-4 py-3"><Badge tone={statusToTone(po.status)}>{po.status}</Badge></td>
                  <td className="px-4 py-3">
                    <Link href={`/purchasing/purchase-orders/${po.id}`} className="text-xs text-sunset hover:underline">View</Link>
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
        title="New purchase order"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button loading={saving} onClick={onSave}>Create PO</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Select label="Supplier" options={[{ value: '', label: 'Select supplier…' }, ...supplierOptions]} value={supplierId} onChange={e => setSupplierId(e.target.value)} />
          <Select label="Receiving branch" options={[{ value: '', label: 'Select branch…' }, ...branchOptions]} value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-ink/80">Items</p>
              <Button size="sm" variant="ghost" onClick={() => setItems([...items, { variantId: '', qty: 1, unitCostMinor: 0 }])}>+ Add</Button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end">
                <div className="col-span-3">
                  <select
                    value={item.variantId}
                    onChange={e => setItems(items.map((it, idx) => idx === i ? { ...it, variantId: e.target.value } : it))}
                    className="form-input w-full text-sm"
                  >
                    <option value="">Select…</option>
                    {variantOptions.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <input type="number" min={1} value={item.qty}
                  onChange={e => setItems(items.map((it, idx) => idx === i ? { ...it, qty: parseInt(e.target.value) || 1 } : it))}
                  placeholder="Qty" className="form-input text-sm"
                />
                <input type="number" min={0} value={item.unitCostMinor}
                  onChange={e => setItems(items.map((it, idx) => idx === i ? { ...it, unitCostMinor: parseFloat(e.target.value) || 0 } : it))}
                  placeholder="Cost" className="form-input text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
