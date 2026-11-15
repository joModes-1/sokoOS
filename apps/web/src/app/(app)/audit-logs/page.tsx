'use client';

import { Fragment, useState } from 'react';
import { useAuditLogs, useActivityReport, useUsers } from '@/hooks/use-queries';
import { formatDate } from '@/lib/format';
import { PageHeader, Spinner, EmptyState, Badge, Select, Input, StatCard, Card } from '@/components/ui';

const PAGE_SIZE = 25;

// Real action codes written by the API — grouped the way the audit service writes them.
const ACTION_TYPES = [
  { value: '', label: 'All actions' },
  { value: 'auth.login.success', label: 'Login (success)' },
  { value: 'auth.login.failed', label: 'Login (failed)' },
  { value: 'auth.mfa.enabled', label: 'MFA enabled' },
  { value: 'auth.password.reset', label: 'Password reset' },
  { value: 'auth.session.revoked', label: 'Session revoked' },
  { value: 'user.invite.create', label: 'User invited' },
  { value: 'business.profile.update', label: 'Business profile changed' },
  { value: 'business.settings.update', label: 'Settings changed' },
  { value: 'catalogue.product.create', label: 'Product created' },
  { value: 'sales.sale.create', label: 'Sale committed' },
  { value: 'inventory.adjustment.create', label: 'Stock adjustment' },
  { value: 'transfer.create', label: 'Transfer created' },
  { value: 'po.create', label: 'Purchase order created' },
  { value: 'debt.create', label: 'Debt created' },
  { value: 'debt.payment', label: 'Debt payment' },
  { value: 'debt.write_off', label: 'Debt written off' },
  { value: 'supplier_debt.create', label: 'Supplier debt created' },
  { value: 'supplier_debt.payment', label: 'Supplier debt payment' },
  { value: 'supplier_debt.write_off', label: 'Supplier debt written off' },
];

const SECURITY_ACTIONS = new Set(['auth.login.failed', 'auth.password.reset', 'auth.session.revoked']);

function JsonBlock({ label, value }: { label: string; value: Record<string, unknown> | undefined }) {
  if (!value || Object.keys(value).length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">{label}</p>
      <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-ink/5 p-3 text-xs leading-relaxed text-ink/80">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default function AuditLogsPage() {
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useAuditLogs({
    action: action || undefined,
    actorId: actorId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
  });
  const { data: activity } = useActivityReport({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
  const { data: users } = useUsers();

  const setFilter = (apply: () => void) => { apply(); setPage(1); setExpandedId(null); };
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Append-only record of every business-critical and security action" />

      {/* Activity summary */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Events tracked" value={String(activity?.totals.events ?? 0)} icon="📋" />
        <StatCard label="Active users" value={String(activity?.totals.activeUsers ?? 0)} icon="👥" />
        <StatCard label="Logins" value={String(activity?.totals.logins ?? 0)} icon="🔓" />
        <StatCard
          label="Failed logins"
          value={String(activity?.totals.failedLogins ?? 0)}
          icon="⚠️"
          sub={activity?.totals.failedLogins ? 'Review recent attempts below' : undefined}
        />
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Select options={ACTION_TYPES} value={action} onChange={e => setFilter(() => setAction(e.target.value))} />
        </div>
        <div className="w-56">
          <Select
            options={[
              { value: '', label: 'All users' },
              ...(users ?? []).map(u => ({ value: u.id, label: u.fullName })),
            ]}
            value={actorId}
            onChange={e => setFilter(() => setActorId(e.target.value))}
          />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-ink/50">From</label>
          <Input type="date" value={dateFrom} onChange={e => setFilter(() => setDateFrom(e.target.value))} />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-ink/50">To</label>
          <Input type="date" value={dateTo} onChange={e => setFilter(() => setDateTo(e.target.value))} />
        </div>
        {(action || actorId || dateFrom || dateTo) && (
          <button
            type="button"
            className="text-sm text-ink/50 underline hover:text-ink"
            onClick={() => setFilter(() => { setAction(''); setActorId(''); setDateFrom(''); setDateTo(''); })}
          >
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : isError ? (
        <Card>
          <EmptyState
            icon="🔒"
            title="Audit log unavailable"
            description="Viewing the audit log requires reports access. Ask an administrator if you need this."
          />
        </Card>
      ) : !data?.items?.length ? (
        <Card><EmptyState icon="📋" title="No audit events match these filters" /></Card>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Time</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Actor</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Target</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {data.items.map(log => {
                const expanded = expandedId === log.id;
                const security = SECURITY_ACTIONS.has(log.action);
                return (
                  <Fragment key={log.id}>
                    <tr
                      className="cursor-pointer border-b border-border/50 hover:bg-sand/30"
                      onClick={() => setExpandedId(expanded ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-ink/60 whitespace-nowrap text-xs">{formatDate(log.createdAt, { relative: true })}</td>
                      <td className="px-4 py-3">
                        <Badge tone={security ? 'danger' : 'neutral'}>{log.action.replace(/[._]/g, ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-ink">{log.actorName}</span>
                        {log.actorRole && <span className="ml-2 text-xs text-ink/45">{log.actorRole}</span>}
                      </td>
                      <td className="px-4 py-3 text-ink/60">{log.targetType} · {log.targetId.slice(0, 8)}…</td>
                      <td className="px-2 py-3 text-ink/40">{expanded ? '▾' : '▸'}</td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-border/50 bg-sand/20">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="space-y-2 text-xs text-ink/60">
                              <p><span className="font-semibold text-ink/80">Actor:</span> {log.actorName}{log.actorEmail ? ` (${log.actorEmail})` : ''}</p>
                              <p><span className="font-semibold text-ink/80">Role:</span> {log.actorRole ?? '—'}</p>
                              <p><span className="font-semibold text-ink/80">IP address:</span> {log.ipAddress ?? '—'}</p>
                              <p><span className="font-semibold text-ink/80">Device:</span> <span className="break-all">{log.userAgent ?? '—'}</span></p>
                              <p><span className="font-semibold text-ink/80">Full time:</span> {formatDate(log.createdAt)}</p>
                            </div>
                            <JsonBlock label="Before" value={log.before} />
                            <JsonBlock label="After" value={log.metadata} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <span className="text-ink/50">{total} event{total === 1 ? '' : 's'} · page {page} of {pageCount}</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
                disabled={page >= pageCount}
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent failed logins, surfaced from the activity report */}
      {activity?.recentFailedLogins?.length ? (
        <div className="mt-6">
          <h2 className="mb-3 font-semibold text-ink">Recent failed logins</h2>
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-sand/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">IP address</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink/60">When</th>
                </tr>
              </thead>
              <tbody>
                {activity.recentFailedLogins.map((f, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">{f.actorName}</td>
                    <td className="px-4 py-3 text-ink/60">{f.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3 text-ink/60 text-xs whitespace-nowrap">{formatDate(f.at, { relative: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
