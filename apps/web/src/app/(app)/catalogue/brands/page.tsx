'use client';

import { useState } from 'react';
import { useBrands } from '@/hooks/use-queries';
import { PageHeader, Button, Modal, Input, Spinner, EmptyState } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useBusinessContext } from '@/hooks/use-business';

export default function BrandsPage() {
  const qc = useQueryClient();
  const { businessId } = useBusinessContext();
  const { data: brands, isLoading } = useBrands();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/catalogue/brands', { name: name.trim() });
      qc.invalidateQueries({ queryKey: queryKeys.brands(businessId) });
      setShowAdd(false);
      setName('');
    } catch {}
    setSaving(false);
  }

  return (
    <div>
      <PageHeader
        title="Brands"
        subtitle={brands ? `${brands.length} brands` : ''}
        actions={<Button onClick={() => setShowAdd(true)}>+ Add brand</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !brands?.length ? (
        <EmptyState icon="🏷️" title="No brands yet" action={<Button onClick={() => setShowAdd(true)}>Add brand</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Brand name</th>
                <th className="text-right px-4 py-3 font-semibold text-ink/60">Products</th>
              </tr>
            </thead>
            <tbody>
              {brands.map(brand => (
                <tr key={brand.id} className="border-b border-border/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-ink">{brand.name}</td>
                  <td className="px-4 py-3 text-right text-ink/60">{brand._count?.products ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add brand"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button loading={saving} onClick={onSave}>Save</Button>
          </>
        }
      >
        <Input label="Brand name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Unilever" />
      </Modal>
    </div>
  );
}
