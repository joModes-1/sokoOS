'use client';

import { useState, useEffect } from 'react';
import { useProducts, useCategories, useBrands } from '@/hooks/use-queries';
import { formatMoney } from '@/lib/format';
import { PageHeader, SearchInput, Badge, Spinner, EmptyState, Button, Modal, Input, Select, Textarea, Alert } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useBusinessContext } from '@/hooks/use-business';
import { useForm } from 'react-hook-form';

// "Dettol Soap 100g" + "Default" → "DETT-SOAP-100G-482". Suffix keeps codes unique across similar names.
function makeSku(name: string, variant: string, suffix: string) {
  const words = `${name} ${variant === 'Default' ? '' : variant}`
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(w => w.slice(0, 4));
  return words.length ? `${words.join('-')}-${suffix}` : '';
}
const newSkuSuffix = () => String(Math.floor(100 + Math.random() * 900));

interface ProductForm {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  taxBps: string;
  variantName: string;
  barcode: string;
  unitCostMinor: string;
  unitPriceMinor: string;
  reorderQty: string;
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const { businessId } = useBusinessContext();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useProducts({ q, categoryId });
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ProductForm>({
    defaultValues: { sku: '', name: '', description: '', categoryId: '', brandId: '', taxBps: '1800', variantName: 'Default', barcode: '', unitCostMinor: '', unitPriceMinor: '', reorderQty: '10' }
  });

  // Auto-fill SKU from the name until the user edits the SKU field themselves.
  const [saveError, setSaveError] = useState('');
  const [skuEdited, setSkuEdited] = useState(false);
  const [skuSuffix, setSkuSuffix] = useState(newSkuSuffix);
  const watchedName = watch('name');
  const watchedVariant = watch('variantName');
  useEffect(() => {
    if (!skuEdited) setValue('sku', makeSku(watchedName, watchedVariant, skuSuffix), { shouldValidate: !!watchedName });
  }, [watchedName, watchedVariant, skuEdited, skuSuffix, setValue]);

  function resetForm() {
    reset();
    setSaveError('');
    setSkuEdited(false);
    setSkuSuffix(newSkuSuffix());
  }

  async function onSave(data: ProductForm) {
    setSaving(true);
    setSaveError('');
    try {
      await api.post('/catalogue/products', {
        sku: data.sku,
        name: data.name,
        description: data.description || undefined,
        categoryId: data.categoryId || undefined,
        brandId: data.brandId || undefined,
        taxBps: parseInt(data.taxBps),
        variants: [{
          name: data.variantName,
          barcode: data.barcode || undefined,
          // UGX has no minor unit in this app — amounts are whole shillings (formatMoney doesn't divide).
          unitCostMinor: Math.round(parseFloat(data.unitCostMinor) || 0),
          unitPriceMinor: Math.round(parseFloat(data.unitPriceMinor) || 0),
          reorderQty: parseInt(data.reorderQty) || 0,
        }],
      });
      qc.invalidateQueries({ queryKey: queryKeys.products(businessId) });
      setShowAdd(false);
      resetForm();
    } catch (e: unknown) {
      setSaveError((e as { message?: string })?.message ?? 'Could not save product');
    }
    setSaving(false);
  }

  const catOptions = [{ value: '', label: 'All categories' }, ...(categories ?? []).map(c => ({ value: c.id, label: c.name }))];

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={data ? `${data.total} products` : ''}
        actions={<Button onClick={() => setShowAdd(true)}>+ Add product</Button>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search products…" className="flex-1 min-w-48" />
        <Select
          options={catOptions}
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className="w-44"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : !data?.items?.length ? (
        <EmptyState
          icon="📦"
          title="No products yet"
          description="Add your first product to start selling"
          action={<Button onClick={() => setShowAdd(true)}>Add product</Button>}
        />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-sand/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-ink/60">Price</th>
                  <th className="text-right px-4 py-3 font-semibold text-ink/60">Cost</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(product => (
                  product.variants.map((variant, vi) => (
                    <tr key={`${product.id}-${variant.id}`} className="border-b border-border/50 hover:bg-sand/30 transition-colors">
                      <td className="px-4 py-3">
                        {vi === 0 && (
                          <p className="font-medium text-ink">{product.name}</p>
                        )}
                        {variant.name !== 'Default' && (
                          <p className={`text-ink/50 ${vi === 0 ? 'text-xs' : 'text-sm'}`}>
                            {vi > 0 ? '↳ ' : ''}{variant.name}
                          </p>
                        )}
                        <p className="text-xs text-ink/30">{variant.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-ink/60">{product.categoryName ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">{formatMoney(variant.unitPriceMinor)}</td>
                      <td className="px-4 py-3 text-right text-ink/60">{formatMoney(variant.unitCostMinor)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={variant.isActive ? 'success' : 'neutral'}>
                          {variant.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); resetForm(); }}
        title="Add new product"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSubmit(onSave)}>Save product</Button>
          </>
        }
      >
        <form className="space-y-4">
          {saveError && <Alert tone="danger">{saveError}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU (auto, editable)"
              placeholder="Fills in from the name"
              error={errors.sku?.message}
              {...register('sku', {
                required: 'Required',
                // Clearing the box hands control back to auto-generation.
                onChange: (e) => setSkuEdited(e.target.value.trim() !== ''),
              })}
            />
            <Select label="Tax rate" options={[{ value: '0', label: 'Tax exempt (0%)' }, { value: '1800', label: 'Standard VAT (18%)' }]} {...register('taxBps')} />
          </div>
          <Input label="Product name" placeholder="Dettol Soap 100g" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <Textarea label="Description (optional)" placeholder="Short product description…" {...register('description')} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" options={[{ value: '', label: '— None —' }, ...(categories ?? []).map(c => ({ value: c.id, label: c.name }))]} {...register('categoryId')} />
            <Select label="Brand" options={[{ value: '', label: '— None —' }, ...(brands ?? []).map(b => ({ value: b.id, label: b.name }))]} {...register('brandId')} />
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold text-ink mb-3">First variant</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Variant name" placeholder="Default" {...register('variantName', { required: 'Required' })} />
              <Input label="Barcode" placeholder="Scan or type…" {...register('barcode')} />
              <Input label="Cost price (UGX)" type="number" placeholder="1000" error={errors.unitCostMinor?.message} {...register('unitCostMinor', { required: 'Required' })} />
              <Input label="Selling price (UGX)" type="number" placeholder="1500" error={errors.unitPriceMinor?.message} {...register('unitPriceMinor', { required: 'Required' })} />
              <Input label="Reorder qty" type="number" placeholder="10" {...register('reorderQty')} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
