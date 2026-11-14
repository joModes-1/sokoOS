'use client';

import { useRoles } from '@/hooks/use-queries';
import { PageHeader, Card, Spinner, EmptyState, Badge } from '@/components/ui';

export default function RolesSettingsPage() {
  const { data: roles, isLoading } = useRoles();

  return (
    <div>
      <PageHeader title="Roles &amp; Permissions" subtitle="Manage access control for your team" />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !roles?.length ? (
        <EmptyState icon="🔑" title="No roles configured" />
      ) : (
        <div className="space-y-4">
          {roles.map(role => (
            <Card key={role.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-ink">{role.name}</h3>
                    {role.isSystem && <Badge tone="info">System</Badge>}
                    {role._count?.userRoles && (
                      <span className="text-xs text-ink/40">{role._count.userRoles} member{role._count.userRoles !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {role.description && <p className="text-sm text-ink/50">{role.description}</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.permissions.map(perm => (
                  <span key={perm} className="text-xs bg-sand border border-border rounded px-2 py-0.5 font-mono text-ink/60">
                    {perm}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
