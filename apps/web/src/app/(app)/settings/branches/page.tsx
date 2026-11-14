'use client';

import { useState } from 'react';
import { useBranches } from '@/hooks/use-queries';
import { PageHeader, Button, Spinner, EmptyState, Badge, Modal, Input, Alert } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useBusinessContext } from '@/hooks/use-business';
import { useForm } from 'react-hook-form';

interface BranchForm {
  name: string;
  code: string;
  address: string;
  phone: string;
}

export default function BranchesSettingsPage() {
  const qc = useQueryClient();
  const { businessId } = useBusinessContext();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: branches, isLoading } = useBranches();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BranchForm>({
    defaultValues: { name: '', code: '', address: '', phone: '' }
  });

  async function onSave(data: BranchForm) {
    setSaving(true);
    setError('');
    try {
      await api.post('/branches', data);
      qc.invalidateQueries({ queryKey: queryKeys.branches(businessId) });
      setShowAdd(false);
      reset();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Failed to create branch');
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader
        title="Branches"
        subtitle={branches ? `${branches.length} branches` : ''}
        actions={<Button onClick={() => setShowAdd(true)}>+ Add branch</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !branches?.length ? (
        <EmptyState icon="🏪" title="No branches" action={<Button onClick={() => setShowAdd(true)}>Add branch</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Branch</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Status</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(branch => (
                <tr key={branch.id} className="border-b border-border/50 hover:bg-sand/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{branch.name}</p>
                    {branch.address && <p className="text-xs text-ink/40">{branch.address}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink/60">{branch.code}</td>
                  <td className="px-4 py-3 text-ink/60">{branch.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={branch.isActive ? 'success' : 'neutral'}>{branch.isActive ? 'Active' : 'Inactive'}</Badge>
                      {branch.isMain && <Badge tone="info">Main</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add branch"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit(onSave)}>Create branch</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Branch name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
            <Input label="Code" placeholder="KLA01" error={errors.code?.message} hint="Short unique identifier"
              {...register('code', { required: 'Required', pattern: { value: /^[A-Z0-9]+$/, message: 'Uppercase letters/numbers only' } })} />
          </div>
          <Input label="Address" {...register('address')} />
          <Input label="Phone" type="tel" {...register('phone')} />
        </div>
      </Modal>
    </div>
  );
}
