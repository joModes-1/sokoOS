import { z } from 'zod';

export const StockAdjustmentSchema = z.object({
  branchId: z.string().uuid(),
  productVariantId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  quantityDelta: z.number().refine((n) => n !== 0, 'Quantity delta cannot be zero'),
  reasonCode: z.enum(['MANUAL', 'STOCK_COUNT', 'WRITE_OFF', 'DAMAGE', 'EXPIRY']),
  reasonText: z.string().min(1, 'Reason is required').max(500),
  batchNumber: z.string().optional(),
  expiryDate: z.string().date().optional().nullable(),
});

export const StockTransferCreateSchema = z.object({
  originBranchId: z.string().uuid(),
  destinationBranchId: z.string().uuid(),
  note: z.string().max(500).optional(),
  items: z.array(z.object({
    productVariantId: z.string().uuid(),
    batchId: z.string().uuid().optional().nullable(),
    requestedQuantity: z.number().positive('Quantity must be positive'),
  })).min(1, 'At least one item required'),
}).refine(d => d.originBranchId !== d.destinationBranchId, {
  message: 'Origin and destination branches must be different',
});

export const TransferApproveSchema = z.object({
  approve: z.boolean(),
  rejectionReason: z.string().min(1).max(500).optional(),
}).refine(d => d.approve || !!d.rejectionReason, {
  message: 'Rejection reason is required when rejecting',
});

export const TransferReceiveSchema = z.object({
  items: z.array(z.object({
    transferItemId: z.string().uuid(),
    receivedQuantity: z.number().nonnegative(),
    shortfallNote: z.string().max(500).optional(),
  })).min(1),
});

export const StockCountStartSchema = z.object({
  branchId: z.string().uuid(),
  variantIds: z.array(z.string().uuid()).optional(),
  note: z.string().max(500).optional(),
});

export const StockCountItemSchema = z.object({
  productVariantId: z.string().uuid(),
  batchId: z.string().uuid().optional().nullable(),
  countedQuantity: z.number().nonnegative(),
});

export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;
export type StockTransferCreateInput = z.infer<typeof StockTransferCreateSchema>;
