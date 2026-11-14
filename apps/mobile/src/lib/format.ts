/** Format utilities for React Native app */

export function formatMoney(amountMinor: number | bigint, currency = 'UGX', opts?: { short?: boolean }): string {
  const n = typeof amountMinor === 'bigint' ? Number(amountMinor) : amountMinor;
  const neg = n < 0;
  const abs = Math.abs(n);
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

export function formatDate(date: string | Date, opts?: { relative?: boolean; time?: boolean }): string {
  const d = new Date(date);
  if (opts?.relative) {
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
  }
  if (opts?.time) {
    return d.toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatQty(qty: number): string {
  if (qty === Math.floor(qty)) return qty.toLocaleString('en-UG');
  return qty.toFixed(2);
}

export function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}
