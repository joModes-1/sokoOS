import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { StockAdjustmentInput } from '@sokoos/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Balances ──────────────────────────────────────────────────────────────
  async getBalances(businessId: string, filters: {
    branchId?: string;
    categoryId?: string;
    brandId?: string;
    lowStockOnly?: boolean;
    page?: number;
    limit?: number;
    q?: string;
  }) {
    const { page = 1, limit = 25, q, branchId, lowStockOnly } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryBalanceWhereInput = {
      businessId,
      ...(branchId && { branchId }),
      variant: {
        deletedAt: null,
        ...(q && {
          OR: [
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q, mode: 'insensitive' } },
            { product: { name: { contains: q, mode: 'insensitive' } } },
          ],
        }),
      },
      ...(lowStockOnly && {
        // quantity_on_hand <= reorder_level — handled post-query since it's computed
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.inventoryBalance.findMany({
        where,
        skip,
        take: limit,
        include: {
          variant: { include: { product: { include: { category: true, brand: true } } } },
          batch: true,
          branch: true,
        },
        orderBy: { lastMovementAt: 'desc' },
      }),
      this.prisma.inventoryBalance.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── Stock movements (immutable ledger) ────────────────────────────────────
  async getMovements(businessId: string, filters: {
    branchId?: string;
    productVariantId?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 25, branchId, productVariantId } = filters;
    const skip = (page - 1) * limit;

    const where = {
      businessId,
      ...(branchId && { branchId }),
      ...(productVariantId && { productVariantId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        include: {
          variant: { include: { product: true } },
          batch: true,
          branch: true,
        },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── Adjustments ───────────────────────────────────────────────────────────
  async createAdjustment(businessId: string, actorId: string, input: StockAdjustmentInput) {
    if (!input.reasonText?.trim()) {
      throw new BadRequestException({ code: 'REASON_REQUIRED', message: 'Adjustment reason is required' });
    }

    // Verify branch belongs to business
    const branch = await this.prisma.branch.findFirst({
      where: { id: input.branchId, businessId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    // Check negative stock constraint
    if (input.quantityDelta < 0) {
      const balance = await this.prisma.inventoryBalance.findFirst({
        where: {
          businessId,
          branchId: input.branchId,
          productVariantId: input.productVariantId,
          batchId: input.batchId ?? null,
        },
      });

      const currentQty = Number(balance?.quantityOnHand ?? 0);
      const newQty = currentQty + input.quantityDelta;

      const settings = await this.prisma.businessSettings.findUnique({ where: { businessId } });

      const allowNegative = branch.allowNegativeStock ?? settings?.allowNegativeStock ?? false;
      if (!allowNegative && newQty < 0) {
        throw new ConflictException({ code: 'INSUFFICIENT_STOCK', message: `Insufficient stock. Available: ${currentQty}` });
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Create the immutable movement
      const movement = await tx.stockMovement.create({
        data: {
          businessId,
          branchId: input.branchId,
          productVariantId: input.productVariantId,
          batchId: input.batchId,
          movementType: 'ADJUSTMENT',
          quantityDelta: input.quantityDelta,
          reason: input.reasonText,
          actorUserId: actorId,
          occurredAt: new Date(),
        },
      });

      // Create the adjustment record
      const adjustment = await tx.stockAdjustment.create({
        data: {
          businessId,
          branchId: input.branchId,
          productVariantId: input.productVariantId,
          batchId: input.batchId,
          quantityDelta: input.quantityDelta,
          reasonCode: input.reasonCode,
          reasonText: input.reasonText,
          actorUserId: actorId,
          stockMovementId: movement.id,
        },
      });

      // Update the balance projection
      await this.upsertBalance(tx, {
        businessId,
        branchId: input.branchId,
        productVariantId: input.productVariantId,
        batchId: input.batchId,
        delta: input.quantityDelta,
        occurredAt: new Date(),
      });

      await this.audit.log(tx, {
        businessId,
        actorUserId: actorId,
        action: 'inventory.adjustment.create',
        targetType: 'StockAdjustment',
        targetId: adjustment.id,
        after: { quantity: input.quantityDelta, reason: input.reasonText },
      });

      return adjustment;
    });
  }

  // ── Batch management ──────────────────────────────────────────────────────
  async getBatches(businessId: string, filters: { branchId?: string; expired?: boolean; page?: number; limit?: number }) {
    const { page = 1, limit = 25, expired } = filters;
    const now = new Date();

    const where: Prisma.StockBatchWhereInput = {
      businessId,
      ...(expired === true && { status: 'EXPIRED' }),
      ...(expired === false && { status: 'ACTIVE' }),
    };

    const [data, total] = await Promise.all([
      this.prisma.stockBatch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { variant: { include: { product: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
      this.prisma.stockBatch.count({ where }),
    ]);

    // Auto-mark expired batches
    await this.prisma.stockBatch.updateMany({
      where: { businessId, status: 'ACTIVE', expiryDate: { lt: now } },
      data: { status: 'EXPIRED' },
    });

    return { data, total, page, limit };
  }

  async writeOffBatch(businessId: string, actorId: string, batchId: string, branchId: string, reason: string) {
    const batch = await this.prisma.stockBatch.findFirst({
      where: { id: batchId, businessId },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    const balance = await this.prisma.inventoryBalance.findFirst({
      where: { businessId, branchId, batchId },
    });
    const qty = Number(balance?.quantityOnHand ?? 0);
    if (qty <= 0) throw new BadRequestException('No stock to write off');

    return this.createAdjustment(businessId, actorId, {
      branchId,
      productVariantId: batch.productVariantId,
      batchId,
      quantityDelta: -qty,
      reasonCode: 'WRITE_OFF',
      reasonText: reason || 'Batch write-off',
    });
  }

  // ── Low stock ─────────────────────────────────────────────────────────────
  async getLowStock(businessId: string, branchId?: string) {
    // Items where quantity_on_hand <= reorder_level on the product
    const balances = await this.prisma.inventoryBalance.findMany({
      where: { businessId, ...(branchId && { branchId }) },
      include: { variant: { include: { product: true } }, branch: true },
    });

    return balances.filter(b => {
      const reorderLevel = Number(b.variant.product.reorderLevel);
      const qty = Number(b.quantityOnHand);
      return reorderLevel > 0 && qty <= reorderLevel;
    });
  }

  /**
   * Atomically reserve stock. The conditional UPDATE prevents two concurrent sales from
   * both passing a read-then-write check (which is how overselling happened).
   * Throws INSUFFICIENT_STOCK unless the branch allows negative stock.
   */
  async decrementBalance(
    tx: Prisma.TransactionClient,
    opts: {
      businessId: string;
      branchId: string;
      productVariantId: string;
      batchId?: string | null;
      quantity: number;
      allowNegative: boolean;
      occurredAt: Date;
    },
  ) {
    const key = {
      businessId: opts.businessId,
      branchId: opts.branchId,
      productVariantId: opts.productVariantId,
      batchId: opts.batchId ?? null,
    };

    const updated = await tx.inventoryBalance.updateMany({
      where: { ...key, quantityOnHand: { gte: opts.quantity } },
      data: { quantityOnHand: { decrement: opts.quantity }, lastMovementAt: opts.occurredAt },
    });

    if (updated.count === 0) {
      if (!opts.allowNegative) {
        throw new ConflictException({
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock for this item',
          details: [{ productVariantId: opts.productVariantId, requested: opts.quantity }],
        });
      }
      await this.upsertBalance(tx, {
        ...key,
        delta: -opts.quantity,
        occurredAt: opts.occurredAt,
      });
    }
  }

  // ── Balance upsert (called after every stock movement) ────────────────────
  async upsertBalance(
    tx: Prisma.TransactionClient,
    opts: { businessId: string; branchId: string; productVariantId: string; batchId?: string | null; delta: number; occurredAt: Date },
  ) {
    const key = {
      businessId: opts.businessId,
      branchId: opts.branchId,
      productVariantId: opts.productVariantId,
      batchId: opts.batchId ?? null,
    };

    const existing = await tx.inventoryBalance.findFirst({ where: key });
    if (existing) {
      await tx.inventoryBalance.update({
        where: { id: existing.id },
        data: {
          quantityOnHand: { increment: opts.delta },
          lastMovementAt: opts.occurredAt,
        },
      });
    } else {
      await tx.inventoryBalance.create({
        data: {
          ...key,
          quantityOnHand: opts.delta,
          lastMovementAt: opts.occurredAt,
        },
      });
    }
  }
}
