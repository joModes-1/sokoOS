'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Alert } from '@/components/ui';

const NOTIFICATION_TYPES = [
  { key: 'low_stock', label: 'Low stock alerts', description: 'When a product goes below reorder level' },
  { key: 'sale_completed', label: 'Sale completed', description: 'When a sale is finalized' },
  { key: 'transfer_requested', label: 'Transfer requested', description: 'When a branch requests a stock transfer' },
  { key: 'po_confirmed', label: 'PO confirmed', description: 'When a purchase order is confirmed by supplier' },
  { key: 'payment_failed', label: 'Payment failed', description: 'Mobile money payment failures' },
  { key: 'user_invited', label: 'Team member invited', description: 'When someone is invited to the workspace' },
];

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, { email: boolean; push: boolean }>>({});
  const [saved, setSaved] = useState(false);

  function toggle(key: string, channel: 'email' | 'push') {
    setPrefs(p => ({
      ...p,
      [key]: { ...(p[key] ?? { email: true, push: true }), [channel]: !(p[key]?.[channel] ?? true) }
    }));
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Notification Preferences" />
      {saved && <Alert tone="success" className="mb-4">Preferences saved!</Alert>}

      <Card padding={false}>
        <div className="p-4 border-b border-border flex justify-between text-xs font-semibold text-ink/50 uppercase tracking-wide">
          <span>Notification type</span>
          <div className="flex gap-8">
            <span>Email</span>
            <span>Push</span>
          </div>
        </div>
        {NOTIFICATION_TYPES.map(type => {
          const pref = prefs[type.key] ?? { email: true, push: true };
          return (
            <div key={type.key} className="flex items-center justify-between p-4 border-b border-border/50 hover:bg-sand/30">
              <div>
                <p className="text-sm font-medium text-ink">{type.label}</p>
                <p className="text-xs text-ink/40">{type.description}</p>
              </div>
              <div className="flex gap-8 flex-shrink-0">
                <input type="checkbox" checked={pref.email} onChange={() => toggle(type.key, 'email')} className="w-4 h-4 rounded border-border" />
                <input type="checkbox" checked={pref.push} onChange={() => toggle(type.key, 'push')} className="w-4 h-4 rounded border-border" />
              </div>
            </div>
          );
        })}
      </Card>

      <div className="mt-4">
        <Button onClick={() => setSaved(true)}>Save preferences</Button>
      </div>
    </div>
  );
}
