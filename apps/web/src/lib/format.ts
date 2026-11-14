/** Formatting utilities for SokoOS UI */

export function formatMoney(amountMinor: bigint | number, currency = 'UGX', opts?: { short?: boolean }): string {
  const amount = typeof amountMinor === 'bigint' ? Number(amountMinor) : amountMinor;
  const neg = amount < 0;
  const abs = Math.abs(amount);
  const prefix = neg ? '−' : '';

  let formatted: string;
  if (opts?.short) {
    if (abs >= 1_000_000_000) formatted = `${(abs / 1_000_000_000).toFixed(1)}B`;
    else if (abs >= 1_000_000) formatted = `${(abs / 1_000_000).toFixed(1)}M`;
    else if (abs >= 1_000) formatted = `${(abs / 1_000).toFixed(0)}K`;
    else formatted = abs.toLocaleString('en-UG');
  } else {
    formatted = abs.toLocaleString('en-UG');
  }

  return `${prefix}${currency} ${formatted}`;
}

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
  return d.toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
}

export function formatQuantity(qty: number | string | bigint): string {
  const n = typeof qty === 'bigint' ? Number(qty) : Number(qty);
  if (n === Math.floor(n)) return n.toLocaleString('en-UG');
  return n.toFixed(2);
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function statusToTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status.toUpperCase()) {
    case 'ACTIVE': case 'COMPLETED': case 'RECEIVED': case 'CLOSED': case 'SUCCEEDED': case 'POSTED': return 'success';
    case 'PENDING': case 'SUBMITTED': case 'CONFIRMED': case 'PARTIALLY_RECEIVED': case 'REQUESTED': case 'APPROVED': case 'DISPATCHED': return 'warning';
    case 'CANCELLED': case 'REJECTED': case 'REFUNDED': case 'RETURNED': case 'FAILED': case 'EXPIRED': return 'danger';
    case 'DRAFT': return 'neutral';
    case 'EXPIRING_SOON': return 'warning';
    default: return 'neutral';
  }
}

export function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}
