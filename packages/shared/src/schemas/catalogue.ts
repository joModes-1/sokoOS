import { z } from 'zod';

export const CategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const BrandSchema = z.object({
  name: z.string().min(1).max(100),
});

export const ProductSchema = z.object({
  name: z.string().min(1, 'Product name required').max(200),
  categoryId: z.string().uuid().optional().nullable(),
  brandId: z.string().uuid().optional().nullable(),
  unitOfMeasure: z.string().max(20).optional(),
  costPriceMinor: z.coerce.bigint().nonnegative(),
  sellingPriceMinor: z.coerce.bigint().nonnegative(),
  currency: z.string().length(3).default('UGX'),
  taxRateBp: z.number().int().min(0).max(10000).default(1800),
  isBatchTracked: z.boolean().default(false),
  reorderLevel: z.coerce.number().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export const ProductVariantSchema = z.object({
  sku: z.string().min(1, 'SKU required').max(50).toUpperCase(),
  barcode: z.string().max(50).optional().nullable(),
  variantName: z.string().max(100).optional(),
  attributes: z.record(z.string()).optional(),
  costPriceMinor: z.coerce.bigint().nonnegative().optional().nullable(),
  sellingPriceMinor: z.coerce.bigint().nonnegative().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const ImportJobSchema = z.object({
  importType: z.enum(['products', 'suppliers', 'categories', 'opening_stock']),
  objectKey: z.string().min(1),
  branchId: z.string().uuid().optional(),
});

export type CategoryInput = z.infer<typeof CategorySchema>;
export type ProductInput = z.infer<typeof ProductSchema>;
export type ProductVariantInput = z.infer<typeof ProductVariantSchema>;
