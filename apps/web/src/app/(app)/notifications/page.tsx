'use client';

import { useNotifications } from '@/hooks/use-queries';
import { formatDate } from '@/lib/format';
import { PageHeader, Spinner, EmptyState } from '@/components/ui';
import Link from 'next/link';

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();

  const unread = (notifications ?? []).filter(n => !n.isRead).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !notifications?.length ? (
        <EmptyState icon="🔔" title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden divide-y divide-border">
          {notifications.map(n => (
            <div key={n.id} className={`p-4 hover:bg-sand/30 transition-colors ${!n.isRead ? 'bg-sunset/5' : ''}`}>
              <div className="flex gap-3">
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-sunset mt-1.5 flex-shrink-0" />}
                <div className={!n.isRead ? '' : 'ml-5'}>
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  <p className="text-sm text-ink/60 mt-0.5">{n.body}</p>
                  <p className="text-xs text-ink/30 mt-1">{formatDate(n.createdAt, { relative: true })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
