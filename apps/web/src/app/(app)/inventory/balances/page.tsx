'use client';

import { useState } from 'react';
import { useInventoryBalances } from '@/hooks/use-queries';
import { formatQuantity } from '@/lib/format';
import { PageHeader, SearchInput, Badge, Spinner, EmptyState, Tabs } from '@/components/ui';

export default function InventoryBalancesPage() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');

  const { data, isLoading } = useInventoryBalances({ q, lowStock: tab === 'low' });

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={data ? `${data.total} items tracked` : ''}
      />

      <div className="flex flex-wrap gap-3 items-center mb-5">
        <SearchInput value={q} onChange={setQ} placeholder="Search products…" className="flex-1 min-w-48" />
        <Tabs
          tabs={[{ key: 'all', label: 'All stock' }, { key: 'low', label: 'Low stock' }]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items?.length ? (
        <EmptyState icon="📦" title={tab === 'low' ? 'No low stock items' : 'No inventory yet'} description="Stock appears here after a sale or goods receipt" />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-sand/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Branch</th>
                  <th className="text-right px-4 py-3 font-semibold text-ink/60">On hand</th>
                  <th className="text-right px-4 py-3 font-semibold text-ink/60">Reserved</th>
                  <th className="text-right px-4 py-3 font-semibold text-ink/60">Available</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => {
                  const available = item.qty - item.reservedQty;
                  const isLow = item.qty <= item.reorderQty;
                  const isOut = item.qty <= 0;
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-sand/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{item.productName}</p>
                        {item.variantName !== 'Default' && (
                          <p className="text-xs text-ink/40">{item.variantName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink/60">{item.branchName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">{formatQuantity(item.qty)}</td>
                      <td className="px-4 py-3 text-right text-ink/50">{formatQuantity(item.reservedQty)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${isOut ? 'text-danger' : isLow ? 'text-warning' : 'text-ink'}`}>
                        {formatQuantity(available)}
                      </td>
                      <td className="px-4 py-3">
                        {isOut ? (
                          <Badge tone="danger">Out of stock</Badge>
                        ) : isLow ? (
                          <Badge tone="warning">Low stock</Badge>
                        ) : (
                          <Badge tone="success">In stock</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
