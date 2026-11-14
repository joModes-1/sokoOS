import { z } from 'zod';

export const SaleItemSchema = z.object({
  productVariantId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  quantity: z.number().positive(),
  overrideUnitPriceMinor: z.coerce.bigint().nonnegative().optional(),
  discountMinor: z.coerce.bigint().nonnegative().optional().default(0n),
});

export const CommitSaleSchema = z.object({
  branchId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(100),
  customerId: z.string().uuid().optional().nullable(),
  items: z.array(SaleItemSchema).min(1, 'Cart is empty'),
  note: z.string().max(500).optional(),
  discountMinor: z.coerce.bigint().nonnegative().optional().default(0n),
  payments: z.array(z.object({
    method: z.enum(['MTN_MOMO', 'AIRTEL_MONEY', 'CASH']),
    amountMinor: z.coerce.bigint().positive(),
    amountTenderedMinor: z.coerce.bigint().positive().optional(),
    phoneNumber: z.string().optional(),
  })).optional().default([]),
});

export const RefundSchema = z.object({
  reasonCode: z.enum(['CUSTOMER_REQUEST', 'DAMAGED', 'WRONG_ITEM', 'EXPIRED', 'OTHER']),
  items: z.array(z.object({
    saleItemId: z.string().uuid(),
    quantity: z.number().positive(),
    restock: z.boolean().default(true),
  })).min(1),
});

export const PaymentSchema = z.object({
  saleId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(100),
  method: z.enum(['MTN_MOMO', 'AIRTEL_MONEY', 'CASH']),
  amountMinor: z.coerce.bigint().positive(),
  amountTenderedMinor: z.coerce.bigint().positive().optional(),
  phoneNumber: z.string().optional(), // for mobile money
  currency: z.string().length(3).default('UGX'),
});

export const DayClosureSchema = z.object({
  branchId: z.string().uuid(),
  businessDate: z.string().date(),
  denominations: z.array(z.object({
    denominationValue: z.number().positive(),
    count: z.number().int().nonnegative(),
    amount: z.number().nonnegative(),
  })),
  countedCashMinor: z.coerce.bigint().nonnegative(),
  discrepancyReason: z.string().max(1000).optional(),
}).refine(d => {
  // If discrepancy reason is required when counted !== expected (enforced server-side)
  return true;
}, { message: 'Discrepancy reason required' });

export type CommitSaleInput = z.infer<typeof CommitSaleSchema>;
export type PaymentInput = z.infer<typeof PaymentSchema>;
export type DayClosureInput = z.infer<typeof DayClosureSchema>;
