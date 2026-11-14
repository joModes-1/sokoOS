import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { CategoryInput, ProductInput, ProductVariantInput } from '@sokoos/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class CatalogueService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ── Categories ────────────────────────────────────────────────────────────
  async listCategories(businessId: string) {
    return this.prisma.category.findMany({
      where: { businessId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(businessId: string, userId: string, input: CategoryInput) {
    const exists = await this.prisma.category.findFirst({
      where: { businessId, name: { equals: input.name, mode: 'insensitive' }, deletedAt: null },
    });
    if (exists) throw new ConflictException({ code: 'DUPLICATE_CATEGORY_NAME', message: `Category "${input.name}" already exists` });

    return this.prisma.category.create({ data: { businessId, ...input } });
  }

  async deleteCategory(businessId: string, categoryId: string) {
    const inUse = await this.prisma.product.count({ where: { categoryId, businessId, deletedAt: null } });
    if (inUse > 0) throw new BadRequestException({ code: 'IN_USE', message: 'Cannot delete category — products are using it' });
    return this.prisma.category.update({ where: { id: categoryId }, data: { deletedAt: new Date() } });
  }

  // ── Brands ────────────────────────────────────────────────────────────────
  async listBrands(businessId: string) {
    return this.prisma.brand.findMany({ where: { businessId, deletedAt: null }, orderBy: { name: 'asc' } });
  }

  async createBrand(businessId: string, userId: string, input: { name: string }) {
    const exists = await this.prisma.brand.findFirst({
      where: { businessId, name: { equals: input.name, mode: 'insensitive' }, deletedAt: null },
    });
    if (exists) throw new ConflictException({ code: 'DUPLICATE_BRAND_NAME', message: `Brand "${input.name}" already exists` });
    return this.prisma.brand.create({ data: { businessId, ...input } });
  }

  // ── Products ──────────────────────────────────────────────────────────────
  async listProducts(businessId: string, filters: { q?: string; categoryId?: string; brandId?: string; active?: boolean; page?: number; limit?: number }) {
    const { q, categoryId, brandId, active, page = 1, limit = 25 } = filters;
    const where: Prisma.ProductWhereInput = {
      businessId,
      deletedAt: null,
      ...(categoryId && { categoryId }),
      ...(brandId && { brandId }),
      ...(active !== undefined && { isActive: active }),
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } },
          { variants: { some: { barcode: { contains: q, mode: 'insensitive' } } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { variants: { where: { deletedAt: null } }, category: true, brand: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createProduct(businessId: string, userId: string, input: ProductInput) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { businessId, ...input },
        include: { variants: true },
      });

      // Auto-create a default variant
      const defaultSku = `${product.name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 20)}-${product.id.slice(0, 6).toUpperCase()}`;
      await tx.productVariant.create({
        data: {
          businessId,
          productId: product.id,
          sku: defaultSku,
          variantName: 'Default',
        },
      });

      await this.audit.log(tx, {
        businessId, actorUserId: userId,
        action: 'catalogue.product.create',
        targetType: 'Product', targetId: product.id,
        after: { name: product.name },
      });

      return tx.product.findUnique({ where: { id: product.id }, include: { variants: true, category: true, brand: true } });
    });
  }

  async updateProduct(businessId: string, productId: string, userId: string, input: Partial<ProductInput>) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, businessId, deletedAt: null } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.update({
      where: { id: productId },
      data: input,
      include: { variants: true },
    });
  }

  // ── Variants ──────────────────────────────────────────────────────────────
  async createVariant(businessId: string, productId: string, input: ProductVariantInput) {
    // Check SKU uniqueness
    const skuExists = await this.prisma.productVariant.findFirst({
      where: { businessId, sku: input.sku.toUpperCase(), deletedAt: null },
    });
    if (skuExists) throw new ConflictException({ code: 'DUPLICATE_SKU', message: `SKU "${input.sku}" already exists in this business` });

    // Check barcode uniqueness
    if (input.barcode) {
      const barcodeExists = await this.prisma.productVariant.findFirst({
        where: { businessId, barcode: input.barcode, deletedAt: null },
      });
      if (barcodeExists) throw new ConflictException({ code: 'DUPLICATE_BARCODE', message: `Barcode "${input.barcode}" already exists` });
    }

    return this.prisma.productVariant.create({
      data: { businessId, productId, ...input, sku: input.sku.toUpperCase() },
    });
  }

  // ── Barcode lookup (POS scan) ─────────────────────────────────────────────
  async lookupBarcode(businessId: string, barcode: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { businessId, barcode, deletedAt: null, isActive: true },
      include: { product: { include: { category: true } } },
    });
    if (!variant) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: `Barcode ${barcode} not found` });
    return variant;
  }
}
