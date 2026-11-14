import { z } from 'zod';

/**
 * A customer taking goods now and paying later.
 *
 * `customerName` is free text because that is what a shopkeeper types at the counter; `phone`
 * is the optional key that groups repeated debts under one person.
 */
export const CreateDebtSchema = z.object({
  customerName: z.string().trim().min(1, 'Who took the item?').max(120),
  customerPhone: z.string().trim().max(40).optional().nullable(),
  itemSummary: z.string().trim().max(300).optional().nullable(),
  amountMinor: z.coerce.bigint().positive('Amount must be more than zero'),
  dueAt: z.string().datetime({ offset: true }).or(z.string().date()).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const RecordDebtPaymentSchema = z.object({
  amountMinor: z.coerce.bigint().positive('Payment must be more than zero'),
  method: z.enum(['MTN_MOMO', 'AIRTEL_MONEY', 'CASH']).default('CASH'),
  note: z.string().trim().max(300).optional().nullable(),
  paidAt: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
});

export const WriteOffDebtSchema = z.object({
  reason: z.string().trim().max(300).optional().nullable(),
});

export type CreateDebtInput = z.infer<typeof CreateDebtSchema>;
export type RecordDebtPaymentInput = z.infer<typeof RecordDebtPaymentSchema>;