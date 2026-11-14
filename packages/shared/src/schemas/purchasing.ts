import { z } from 'zod';

export const SupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name required').max(200),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().nullable(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
  tin: z.string().max(20).optional().nullable(),
  paymentTerms: z.string().max(100).optional(),
});

export const PurchaseOrderItemSchema = z.object({
  productVariantId: z.string().uuid(),
  quantityOrdered: z.number().positive('Quantity must be positive'),
  unitCostMinor: z.coerce.bigint().positive('Unit cost required'),
  taxRateBp: z.number().int().min(0).max(10000).default(0),
});

export const PurchaseOrderCreateSchema = z.object({
  branchId: z.string().uuid(),
  supplierId: z.string().uuid(),
  expectedAt: z.string().datetime().optional().nullable(),
  note: z.string().max(1000).optional(),
  items: z.array(PurchaseOrderItemSchema).min(1, 'At least one line required'),
});

export const GoodsReceiptItemSchema = z.object({
  productVariantId: z.string().uuid(),
  purchaseOrderItemId: z.string().uuid(),
  quantityReceived: z.number().positive(),
  unitCostMinor: z.coerce.bigint().positive(),
  batchNumber: z.string().max(50).optional(),
  expiryDate: z.string().date().optional().nullable(),
  overReceiptConfirmed: z.boolean().optional().default(false),
});

export const GoodsReceiptCreateSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  note: z.string().max(1000).optional(),
  items: z.array(GoodsReceiptItemSchema).min(1, 'At least one item required'),
  overReceiptConfirmed: z.boolean().default(false),
});

export type SupplierInput = z.infer<typeof SupplierSchema>;
export type PurchaseOrderCreateInput = z.infer<typeof PurchaseOrderCreateSchema>;
export type GoodsReceiptCreateInput = z.infer<typeof GoodsReceiptCreateSchema>;
