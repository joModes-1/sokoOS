'use client';

import { useState } from 'react';
import { useProducts } from '@/hooks/use-queries';
import { PageHeader, Button, Modal, Input, Select, Textarea, Alert } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useBusinessContext } from '@/hooks/use-business';

// Must match the API's AdjustmentReasonCode enum.
const ADJUSTMENT_REASONS = [
  { value: 'DAMAGE', label: 'Damaged goods' },
  { value: 'WRITE_OFF', label: 'Theft / write-off' },
  { value: 'EXPIRY', label: 'Expired stock' },
  { value: 'STOCK_COUNT', label: 'Stock count correction' },
  { value: 'MANUAL', label: 'Other manual adjustment' },
];

export default function AdjustmentsPage() {
  const qc = useQueryClient();
  const { businessId, branchId } = useBusinessContext();
  const [showAdd, setShowAdd] = useState(false);
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('STOCK_COUNT');
  const [reasonText, setReasonText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: products } = useProducts({});

  const variantOptions = (products?.items ?? []).flatMap(p =>
    p.variants.map(v => ({
      value: v.id,
      label: `${p.name}${v.name !== 'Default' ? ` — ${v.name}` : ''} (${v.sku})`,
    }))
  );

  async function onSave() {
    if (!variantId || !qty || !reasonText) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/inventory/adjustments', {
        productVariantId: variantId,
        branchId,
        quantityDelta: parseInt(qty, 10),
        reasonCode: reason,
        reasonText,
      });
      qc.invalidateQueries({ queryKey: queryKeys.balances(businessId) });
      qc.invalidateQueries({ queryKey: queryKeys.movements(businessId) });
      setShowAdd(false);
      setVariantId('');
      setQty('');
      setReasonText('');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Adjustment failed');
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader
        title="Stock Adjustments"
        subtitle="Record stock corrections, damages and write-offs"
        actions={<Button onClick={() => setShowAdd(true)}>+ New adjustment</Button>}
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Audit note:</strong> Every adjustment requires a reason and is permanently logged in the audit trail. Adjustments cannot be deleted.
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="New stock adjustment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button loading={saving} onClick={onSave}>Save adjustment</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Select
            label="Product / variant"
            options={[{ value: '', label: 'Select product…' }, ...variantOptions]}
            value={variantId}
            onChange={e => setVariantId(e.target.value)}
          />
          <Input
            label="Quantity change"
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value)}
            hint="Use negative values to reduce stock (e.g. -5 for damage). Use positive to add stock."
            placeholder="e.g. -10 or +20"
          />
          <Select
            label="Reason"
            options={ADJUSTMENT_REASONS}
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <Textarea
            label="Reason details (required)"
            value={reasonText}
            onChange={e => setReasonText(e.target.value)}
            placeholder="Describe what happened and why the adjustment is needed…"
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
}
