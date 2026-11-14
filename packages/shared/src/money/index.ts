/**
 * SokoOS money utilities — integer minor units only, no floats.
 * All amounts stored as BIGINT in the database.
 * Default currency: UGX (Ugandan Shilling, no decimal places in display)
 */

export const SUPPORTED_CURRENCIES = ['UGX', 'KES', 'TZS', 'USD'] as const;
export type Currency = typeof SUPPORTED_CURRENCIES[number];

/** Minor unit multipliers — UGX has no sub-units so multiplier is 1 */
const MINOR_UNITS: Record<Currency, number> = {
  UGX: 1,
  KES: 100,
  TZS: 100,
  USD: 100,
};

/** Add two minor-unit amounts (safe — integer arithmetic only) */
export function addMinor(a: bigint, b: bigint): bigint {
  return a + b;
}

/** Subtract minor-unit amounts */
export function subMinor(a: bigint, b: bigint): bigint {
  return a - b;
}

/** Multiply a minor-unit amount by a basis-points rate and return minor units */
export function applyBasisPoints(amount: bigint, rateBp: number): bigint {
  return (amount * BigInt(rateBp)) / 10000n;
}

/** Apply a percentage discount and return the discount amount in minor units */
export function applyDiscount(amount: bigint, discountPercent: number): bigint {
  if (discountPercent <= 0) return 0n;
  if (discountPercent >= 100) return amount;
  return (amount * BigInt(Math.round(discountPercent * 100))) / 10000n;
}

/** Format a minor-unit amount for display */
export function formatMoney(
  amountMinor: bigint | number,
  currency: Currency = 'UGX',
  options?: { short?: boolean; signed?: boolean },
): string {
  const amount = typeof amountMinor === 'bigint' ? Number(amountMinor) : amountMinor;
  const divisor = MINOR_UNITS[currency];
  const value = amount / divisor;
  const absValue = Math.abs(value);
  const neg = value < 0;
  const prefix = options?.signed && value > 0 ? '+' : neg ? '−' : '';

  let formatted: string;
  if (options?.short) {
    if (absValue >= 1_000_000_000) formatted = `${(absValue / 1_000_000_000).toFixed(1)}B`;
    else if (absValue >= 1_000_000) formatted = `${(absValue / 1_000_000).toFixed(1)}M`;
    else if (absValue >= 1_000) formatted = `${(absValue / 1_000).toFixed(0)}K`;
    else formatted = absValue.toLocaleString('en-UG');
  } else {
    formatted = absValue.toLocaleString('en-UG');
  }

  return `${prefix}${currency} ${formatted}`;
}

/** Convert a human-entered decimal string to minor units */
export function parseMoneyInput(input: string, currency: Currency = 'UGX'): bigint {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0n;
  const float = parseFloat(cleaned);
  if (isNaN(float)) return 0n;
  const multiplier = MINOR_UNITS[currency];
  return BigInt(Math.round(float * multiplier));
}

/** Compute line total: price × quantity, with VAT */
export function computeLineTotal(opts: {
  unitPriceMinor: bigint;
  quantity: number;      // decimal quantities (e.g. 2.5 kg)
  discountMinor?: bigint;
  taxRateBp?: number;    // e.g. 1800 = 18%
  taxInclusive?: boolean;
}): { subtotal: bigint; discount: bigint; tax: bigint; total: bigint } {
  const qty = BigInt(Math.round(opts.quantity * 1000));
  const subtotal = (opts.unitPriceMinor * qty) / 1000n;
  const discount = opts.discountMinor ?? 0n;
  const afterDiscount = subtotal - discount;
  const rateBp = opts.taxRateBp ?? 0;

  let tax: bigint;
  if (opts.taxInclusive && rateBp > 0) {
    // Extract VAT from inclusive price: tax = price × rate / (100 + rate)
    tax = (afterDiscount * BigInt(rateBp)) / (10000n + BigInt(rateBp));
  } else {
    tax = applyBasisPoints(afterDiscount, rateBp);
  }

  const total = afterDiscount + (opts.taxInclusive ? 0n : tax);
  return { subtotal, discount, tax, total };
}

/** Guard: reject if amount is negative */
export function assertPositive(amount: bigint, field: string): void {
  if (amount < 0n) throw new Error(`${field} must be non-negative, got ${amount}`);
}

/** Guard: reject floats — amounts must be integers (minor units) */
export function assertMinorUnit(value: unknown, field: string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error(`${field} must be a whole number (minor units), got ${value}`);
    return BigInt(value);
  }
  throw new Error(`${field} must be bigint or integer, got ${typeof value}`);
}
