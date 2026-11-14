'use client';

import { useState } from 'react';
import { useCategories } from '@/hooks/use-queries';
import { PageHeader, Button, Modal, Input, Spinner, EmptyState } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useBusinessContext } from '@/hooks/use-business';

export default function CategoriesPage() {
  const qc = useQueryClient();
  const { businessId } = useBusinessContext();
  const { data: categories, isLoading } = useCategories();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/catalogue/categories', { name: name.trim(), parentId: parentId || undefined });
      qc.invalidateQueries({ queryKey: queryKeys.categories(businessId) });
      setShowAdd(false);
      setName('');
      setParentId('');
    } catch {}
    setSaving(false);
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={categories ? `${categories.length} categories` : ''}
        actions={<Button onClick={() => setShowAdd(true)}>+ Add category</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !categories?.length ? (
        <EmptyState icon="🏷️" title="No categories yet" action={<Button onClick={() => setShowAdd(true)}>Add category</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Parent</th>
                <th className="text-right px-4 py-3 font-semibold text-ink/60">Products</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className="border-b border-border/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-ink">{cat.name}</td>
                  <td className="px-4 py-3 text-ink/50">
                    {cat.parentId ? categories.find(c => c.id === cat.parentId)?.name ?? '—' : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-ink/60">{cat._count?.products ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add category"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button loading={saving} onClick={onSave}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Category name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Beverages" />
          <div>
            <label className="text-sm font-medium text-ink/80 block mb-1">Parent category (optional)</label>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="form-input w-full"
            >
              <option value="">— None (top level) —</option>
              {(categories ?? []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
