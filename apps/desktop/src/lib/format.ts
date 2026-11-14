/**
 * UI formatting helpers.
 *
 * Money formatting is re-exported from @sokoos/shared so the desktop app uses the
 * exact same minor-unit semantics as the web app and the backend. The date/quantity
 * helpers mirror apps/web/src/lib/format.ts so the UI language stays consistent.
 */
export { formatMoney } from '@sokoos/shared';

export function formatDate(date: string | Date, opts?: { relative?: boolean }): string {
  const d = new Date(date);
  if (opts?.relative) {
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
  }
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-UG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatQuantity(qty: number | string | bigint): string {
  const n = typeof qty === 'bigint' ? Number(qty) : Number(qty);
  if (n === Math.floor(n)) return n.toLocaleString('en-UG');
  return n.toFixed(2);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
