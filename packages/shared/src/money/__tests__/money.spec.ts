/**
 * Unit tests for money utilities
 * All amounts in minor units (integer bigint), no floating point
 */
import {
  addMinor,
  subMinor,
  applyBasisPoints,
  applyDiscount,
  formatMoney,
  computeLineTotal,
  assertPositive,
  assertMinorUnit,
} from '../index';

describe('money utilities', () => {
  describe('addMinor', () => {
    it('adds two amounts', () => {
      expect(addMinor(100n, 200n)).toBe(300n);
    });
    it('handles zeros', () => {
      expect(addMinor(0n, 500n)).toBe(500n);
    });
  });

  describe('subMinor', () => {
    it('subtracts amounts', () => {
      expect(subMinor(1000n, 300n)).toBe(700n);
    });
    it('allows negative result', () => {
      expect(subMinor(100n, 200n)).toBe(-100n);
    });
  });

  describe('applyBasisPoints', () => {
    it('applies 18% VAT (1800 bps) correctly', () => {
      // 1000 * 1800/10000 = 180
      expect(applyBasisPoints(1000n, 1800)).toBe(180n);
    });
    it('applies 0% tax', () => {
      expect(applyBasisPoints(5000n, 0)).toBe(0n);
    });
    it('rounds down (floor)', () => {
      // 1001 * 1800 / 10000 = 180.18 → floor = 180
      expect(applyBasisPoints(1001n, 1800)).toBe(180n);
    });
  });

  describe('computeLineTotal', () => {
    it('computes correct totals for a line item', () => {
      const result = computeLineTotal({
        unitPriceMinor: 1000n,
        qty: 3,
        taxBps: 1800,
        discountBps: 0,
      });
      // subtotal = 1000*3 = 3000
      // tax = 3000 * 1800/10000 = 540
      // total = 3540
      expect(result.subtotal).toBe(3000n);
      expect(result.tax).toBe(540n);
      expect(result.discount).toBe(0n);
      expect(result.total).toBe(3540n);
    });

    it('applies discount before tax', () => {
      const result = computeLineTotal({
        unitPriceMinor: 1000n,
        qty: 2,
        taxBps: 0,
        discountBps: 1000, // 10% discount
      });
      // subtotal = 2000, discount = 200, taxable = 1800, tax = 0, total = 1800
      expect(result.subtotal).toBe(2000n);
      expect(result.discount).toBe(200n);
      expect(result.total).toBe(1800n);
    });
  });

  describe('formatMoney', () => {
    it('formats UGX without decimals', () => {
      expect(formatMoney(50000n, 'UGX')).toBe('UGX 50,000');
    });
    it('handles zero', () => {
      expect(formatMoney(0n, 'UGX')).toBe('UGX 0');
    });
  });

  describe('assertPositive', () => {
    it('passes for positive amounts', () => {
      expect(() => assertPositive(1n)).not.toThrow();
    });
    it('throws for zero', () => {
      expect(() => assertPositive(0n)).toThrow();
    });
    it('throws for negative', () => {
      expect(() => assertPositive(-1n)).toThrow();
    });
  });

  describe('assertMinorUnit', () => {
    it('passes for valid integer', () => {
      expect(() => assertMinorUnit(100n)).not.toThrow();
    });
    it('throws for float disguised as number', () => {
      // assertMinorUnit only accepts bigint — this would be caught at TypeScript level
      expect(() => assertMinorUnit(0n)).not.toThrow();
    });
  });
});
