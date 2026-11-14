'use client';

import { useState } from 'react';
import { useAuditLogs } from '@/hooks/use-queries';
import { formatDate } from '@/lib/format';
import { PageHeader, Spinner, EmptyState, Badge, Select } from '@/components/ui';

const ACTION_TYPES = [
  { value: '', label: 'All actions' },
  { value: 'USER_LOGIN', label: 'Login' },
  { value: 'SALE_COMMITTED', label: 'Sale' },
  { value: 'STOCK_ADJUSTED', label: 'Stock adjustment' },
  { value: 'TRANSFER_CREATED', label: 'Transfer' },
  { value: 'PO_CREATED', label: 'Purchase order' },
  { value: 'USER_INVITED', label: 'User invited' },
  { value: 'SETTINGS_CHANGED', label: 'Settings changed' },
];

export default function AuditLogsPage() {
  const [action, setAction] = useState('');
  const { data, isLoading } = useAuditLogs({ action: action || undefined });

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Append-only record of all business-critical actions" />

      <div className="mb-5">
        <Select options={ACTION_TYPES} value={action} onChange={e => setAction(e.target.value)} className="w-48" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !data?.items?.length ? (
        <EmptyState icon="📋" title="No audit events" />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Time</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Actor</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Target</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(log => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-sand/30">
                  <td className="px-4 py-3 text-ink/60 whitespace-nowrap text-xs">{formatDate(log.createdAt, { relative: true })}</td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{log.action.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{log.actorName}</td>
                  <td className="px-4 py-3 text-ink/60">{log.targetType} · {log.targetId.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
