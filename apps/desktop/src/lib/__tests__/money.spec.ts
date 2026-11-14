import { describe, expect, it } from 'vitest';
import { computeLineTotal, formatMoney } from '@sokoos/shared';

// Proves the desktop app reuses the platform's minor-unit money logic rather than
// reimplementing it (a deliberate reuse decision from the desktop architecture docs).
describe('shared money reuse', () => {
  it('computes a VAT-inclusive line total in integer minor units', () => {
    const line = computeLineTotal({
      unitPriceMinor: 10_000n,
      quantity: 2,
      taxRateBp: 1800,
      taxInclusive: true,
    });

    expect(line.subtotal).toBe(20_000n);
    expect(line.total).toBe(20_000n);
  });

  it('computes VAT for a tax-exclusive line', () => {
    const line = computeLineTotal({ unitPriceMinor: 10_000n, quantity: 2, taxRateBp: 1800 });
    expect(line.subtotal).toBe(20_000n);
    expect(line.tax).toBe(3_600n);
    expect(line.total).toBe(23_600n);
  });

  it('formats UGX without decimals', () => {
    expect(formatMoney(20_000n, 'UGX')).toBe('UGX 20,000');
  });
});
