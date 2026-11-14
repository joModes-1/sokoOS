'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { PageHeader, Card, Button, Input, Select, Alert, Spinner } from '@/components/ui';
import { BUSINESS_TYPES } from '@sokoos/shared';

interface BusinessSettings {
  id: string;
  name: string;
  type: string;
  phone?: string;
  email?: string;
  address?: string;
  settings: {
    allowNegativeStock: boolean;
    requireApprovalForTransfers: boolean;
    defaultCurrency: string;
    taxRegistrationNumber?: string;
  };
}

export default function BusinessSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { data: biz, isLoading } = useQuery({
    queryKey: ['business-settings'],
    queryFn: () => api.get<BusinessSettings>('/businesses/settings'),
  });

  const [form, setForm] = useState<Partial<BusinessSettings>>();
  const current = form ?? biz;

  async function onSave() {
    if (!current) return;
    setSaving(true);
    setError('');
    try {
      await api.patch('/businesses/settings', current);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Save failed');
    }
    setSaving(false);
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Business Settings" />

      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      {saved && <Alert tone="success" className="mb-4">Settings saved!</Alert>}

      <div className="space-y-6">
        <Card>
          <h2 className="font-semibold text-ink mb-4">Business profile</h2>
          <div className="space-y-4">
            <Input
              label="Business name"
              value={current?.name ?? ''}
              onChange={e => setForm({ ...current, name: e.target.value })}
            />
            <Select
              label="Business type"
              value={current?.type ?? 'RETAIL'}
              options={BUSINESS_TYPES.map(t => ({ value: t.code, label: `${t.icon} ${t.label}` }))}
              onChange={e => setForm({ ...current, type: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Phone"
                value={current?.phone ?? ''}
                onChange={e => setForm({ ...current, phone: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={current?.email ?? ''}
                onChange={e => setForm({ ...current, email: e.target.value })}
              />
            </div>
            <Input
              label="Address"
              value={current?.address ?? ''}
              onChange={e => setForm({ ...current, address: e.target.value })}
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-ink mb-4">Operational settings</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Allow negative stock</p>
                <p className="text-xs text-ink/50">Sell items even when stock balance is zero</p>
              </div>
              <input
                type="checkbox"
                checked={current?.settings?.allowNegativeStock ?? false}
                onChange={e => setForm({ ...current, settings: {
                  allowNegativeStock: e.target.checked,
                  requireApprovalForTransfers: current?.settings?.requireApprovalForTransfers ?? true,
                  defaultCurrency: current?.settings?.defaultCurrency ?? 'UGX',
                  taxRegistrationNumber: current?.settings?.taxRegistrationNumber,
                } })}
                className="rounded border-border w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Require approval for transfers</p>
                <p className="text-xs text-ink/50">Branch managers must approve stock transfers</p>
              </div>
              <input
                type="checkbox"
                checked={current?.settings?.requireApprovalForTransfers ?? true}
                onChange={e => setForm({ ...current, settings: {
                  allowNegativeStock: current?.settings?.allowNegativeStock ?? false,
                  requireApprovalForTransfers: e.target.checked,
                  defaultCurrency: current?.settings?.defaultCurrency ?? 'UGX',
                  taxRegistrationNumber: current?.settings?.taxRegistrationNumber,
                } })}
                className="rounded border-border w-4 h-4"
              />
            </label>
            <Input
              label="Tax registration number (TIN)"
              value={current?.settings?.taxRegistrationNumber ?? ''}
              onChange={e => setForm({ ...current, settings: {
                allowNegativeStock: current?.settings?.allowNegativeStock ?? false,
                requireApprovalForTransfers: current?.settings?.requireApprovalForTransfers ?? true,
                defaultCurrency: current?.settings?.defaultCurrency ?? 'UGX',
                taxRegistrationNumber: e.target.value,
              } })}
              placeholder="1000000000"
            />
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Button loading={saving} onClick={onSave}>Save changes</Button>
      </div>
    </div>
  );
}
