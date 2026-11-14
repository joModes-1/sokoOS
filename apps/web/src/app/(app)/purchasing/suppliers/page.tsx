'use client';

import { useState } from 'react';
import { useSuppliers } from '@/hooks/use-queries';
import { PageHeader, Button, SearchInput, Spinner, EmptyState, Modal, Input, Textarea } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useBusinessContext } from '@/hooks/use-business';
import { useForm } from 'react-hook-form';

interface SupplierForm {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export default function SuppliersPage() {
  const qc = useQueryClient();
  const { businessId } = useBusinessContext();
  const [q, setQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: suppliers, isLoading } = useSuppliers(q);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierForm>({
    defaultValues: { name: '', contactName: '', phone: '', email: '', address: '', notes: '' }
  });

  async function onSave(data: SupplierForm) {
    setSaving(true);
    try {
      await api.post('/purchasing/suppliers', data);
      qc.invalidateQueries({ queryKey: queryKeys.suppliers(businessId) });
      setShowAdd(false);
      reset();
    } catch {}
    setSaving(false);
  }

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle={suppliers ? `${suppliers.length} suppliers` : ''}
        actions={<Button onClick={() => setShowAdd(true)}>+ Add supplier</Button>}
      />

      <SearchInput value={q} onChange={setQ} placeholder="Search suppliers…" className="mb-5 max-w-sm" />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !suppliers?.length ? (
        <EmptyState icon="🏭" title="No suppliers yet" action={<Button onClick={() => setShowAdd(true)}>Add supplier</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Supplier</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Phone</th>
                <th className="text-right px-4 py-3 font-semibold text-ink/60">Orders</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-ink/60">{s.contactName ?? '—'}</td>
                  <td className="px-4 py-3 text-ink/60">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-ink/60">{s._count?.purchaseOrders ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add supplier"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit(onSave)}>Save supplier</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Company / supplier name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact person" {...register('contactName')} />
            <Input label="Phone" type="tel" {...register('phone')} />
          </div>
          <Input label="Email" type="email" {...register('email')} />
          <Textarea label="Address" {...register('address')} rows={2} />
          <Textarea label="Notes" {...register('notes')} rows={2} />
        </div>
      </Modal>
    </div>
  );
}
