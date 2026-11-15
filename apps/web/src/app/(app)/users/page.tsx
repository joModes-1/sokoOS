'use client';

import { useState } from 'react';
import { useUsers, useBranches, useRoles } from '@/hooks/use-queries';
import { formatDate } from '@/lib/format';
import { PageHeader, Button, Badge, Spinner, EmptyState, Modal, Input, Select, Alert } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { api } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useBusinessContext } from '@/hooks/use-business';

export default function UsersPage() {
  const qc = useQueryClient();
  const { businessId } = useBusinessContext();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: users, isLoading } = useUsers();
  const { data: branches } = useBranches();
  const { data: roles } = useRoles();

  const branchOptions = (branches ?? []).map(b => ({ value: b.id, label: b.name }));
  const roleOptions = (roles ?? []).map(r => ({ value: r.id, label: r.name }));

  async function onInvite() {
    if (!email || !roleId) { setError('Email and role are required'); return; }
    setSaving(true);
    setError('');
    try {
      await api.post('/users/invite', { email, roleId, branchId: branchId || undefined });
      qc.invalidateQueries({ queryKey: queryKeys.users(businessId) });
      setShowInvite(false);
      setEmail('');
      setRoleId('');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Invite failed');
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle={users ? `${users.length} members` : ''}
        actions={<Button onClick={() => setShowInvite(true)}>+ Invite member</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !users?.length ? (
        <EmptyState icon="👥" title="No team members yet" action={<Button onClick={() => setShowInvite(true)}>Invite someone</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-border bg-sand/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Joined</th>
                <th className="text-left px-4 py-3 font-semibold text-ink/60">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-border/50 hover:bg-sand/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.fullName} size="sm" />
                      <div>
                        <p className="font-medium text-ink">{user.fullName}</p>
                        <p className="text-xs text-ink/40">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {user.roles.map((r, i) => (
                      <span key={i} className="text-xs bg-sand border border-border rounded-full px-2 py-0.5 text-ink/60 mr-1">
                        {r.roleName}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-ink/60">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={user.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {user.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite team member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button loading={saving} onClick={onInvite}>Send invite</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Input label="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@example.com" />
          <Select label="Role" options={[{ value: '', label: 'Select role…' }, ...roleOptions]} value={roleId} onChange={e => setRoleId(e.target.value)} />
          <Select label="Branch (optional)" options={[{ value: '', label: 'All branches' }, ...branchOptions]} value={branchId} onChange={e => setBranchId(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
