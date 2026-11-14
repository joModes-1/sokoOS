import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { AuditService } from '../audit/audit.service.js';
import { computeLineTotal } from '@sokoos/shared';
import type { CommitSaleInput } from '@sokoos/shared';
import { Prisma } from '@prisma/client';

interface PricedLine {
  productVariantId: string;
  batchId: string | null;
  quantity: number;
  unitPriceMinor: bigint;
  unitCostMinor: bigint | null;
  taxRateBp: number;
  grossMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  lineTotalMinor: bigint;
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private audit: AuditService,
  ) {}

  /**
   * Allocate an order-level discount across lines proportionally to their remaining value.
   * The remainder is distributed one minor unit at a time so the sum is exact.
   */
  private static allocateDiscount(bases: bigint[], discount: bigint): bigint[] {
    const totalBase = bases.reduce((sum, b) => sum + b, 0n);
    if (discount <= 0n || totalBase <= 0n) return bases.map(() => 0n);
    const capped = discount > totalBase ? totalBase : discount;
    const allocations = bases.map((base) => (base * capped) / totalBase);
    let remainder = capped - allocations.reduce((sum, a) => sum + a, 0n);
    let i = 0;
    while (remainder > 0n) {
      allocations[i] += 1n;
      remainder -= 1n;
      i = (i + 1) % allocations.length;
    }
    return allocations;
  }

  // ── Commit a sale ─────────────────────────────────────────────────────────
  async commitSale(businessId: string, cashierId: string, input: CommitSaleInput) {
    // Idempotency check
    const existing = await this.prisma.sale.findFirst({
      where: { businessId, idempotencyKey: input.idempotencyKey },
      include: { receipt: true },
    });
    if (existing) {
      return SalesService.saleResult(existing, existing.receipt?.receiptNumber ?? '', true);
    }

    // Verify branch
    const branch = await this.prisma.branch.findFirst({
      where: { id: input.branchId, businessId, deletedAt: null, status: 'ACTIVE' },
    });
    if (!branch) throw new NotFoundException('Branch not found or inactive');

    const settings = await this.prisma.businessSettings.findUnique({ where: { businessId } });
    const allowNegative = branch.allowNegativeStock ?? settings?.allowNegativeStock ?? false;

    // Resolve each item, price and batch (FEFO)
    const resolvedItems: Array<{
      productVariantId: string;
      batchId: string | null;
      quantity: number;
      unitPriceMinor: bigint;
      discountMinor: bigint;
      taxRateBp: number;
      unitCostMinor: bigint | null;
    }> = [];

    const stockConflicts: Array<{ productVariantId: string; available: number; requested: number }> = [];

    for (const item of input.items) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: item.productVariantId, businessId, deletedAt: null, isActive: true },
        include: { product: true },
      });
      if (!variant) throw new NotFoundException(`Product variant ${item.productVariantId} not found`);

      const unitPriceMinor =
        item.overrideUnitPriceMinor ??
        variant.sellingPriceMinor ??
        variant.product.sellingPriceMinor;
      const taxRateBp = variant.product.taxRateBp;

      let batchId: string | null = item.batchId ?? null;
      if (variant.product.isBatchTracked && !batchId) {
        const batch = await this.prisma.stockBatch.findFirst({
          where: {
            businessId,
            productVariantId: item.productVariantId,
            status: 'ACTIVE',
            expiryDate: { gt: new Date() },
          },
          orderBy: { expiryDate: 'asc' },
        });
        if (!batch) {
          throw new ConflictException({
            code: 'EXPIRED_BATCH',
            message: `No sellable batch available for ${variant.product.name}`,
          });
        }
        batchId = batch.id;
      }

      const balance = await this.prisma.inventoryBalance.findFirst({
        where: {
          businessId,
          branchId: input.branchId,
          productVariantId: item.productVariantId,
          batchId: batchId ?? null,
        },
      });
      const available = Number(balance?.quantityOnHand ?? 0);
      if (!allowNegative && available < item.quantity) {
        stockConflicts.push({
          productVariantId: item.productVariantId,
          available,
          requested: item.quantity,
        });
        continue;
      }

      resolvedItems.push({
        productVariantId: item.productVariantId,
        batchId,
        quantity: item.quantity,
        unitPriceMinor: unitPriceMinor ?? 0n,
        discountMinor: item.discountMinor ?? 0n,
        taxRateBp,
        unitCostMinor: variant.costPriceMinor ?? variant.product.costPriceMinor,
      });
    }

    if (stockConflicts.length > 0) {
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Some items have insufficient stock',
        details: stockConflicts,
      });
    }

    // Compute server-authoritative totals. Item discounts are applied first, then the
    // order-level discount is allocated to lines so Σ lineTotalMinor === sale.totalMinor.
    const grossLines = resolvedItems.map((item) =>
      computeLineTotal({
        unitPriceMinor: item.unitPriceMinor,
        quantity: item.quantity,
        taxRateBp: 0,
      }).subtotal,
    );
    const lineDiscounts = resolvedItems.map((item, i) =>
      item.discountMinor > grossLines[i] ? grossLines[i] : item.discountMinor,
    );
    const afterItemDiscount = grossLines.map((gross, i) => gross - lineDiscounts[i]);
    const saleDiscount = input.discountMinor ?? 0n;
    const allocated = SalesService.allocateDiscount(afterItemDiscount, saleDiscount);

    let subtotalMinor = 0n;
    let totalDiscountMinor = 0n;
    let taxMinor = 0n;
    let totalMinor = 0n;

    const pricedLines: PricedLine[] = resolvedItems.map((item, i) => {
      const discount = lineDiscounts[i] + allocated[i];
      const { tax, total } = computeLineTotal({
        unitPriceMinor: item.unitPriceMinor,
        quantity: item.quantity,
        discountMinor: discount,
        taxRateBp: item.taxRateBp,
      });
      subtotalMinor += grossLines[i];
      totalDiscountMinor += discount;
      taxMinor += tax;
      totalMinor += total;
      return {
        ...item,
        discountMinor: discount,
        grossMinor: grossLines[i],
        taxMinor: tax,
        lineTotalMinor: total,
      };
    });

    // Payments must cover the sale exactly. Cash may be tendered above the amount due
    // (change is recorded), mobile money must equal its payment amount.
    const payments = input.payments ?? [];
    const paymentTotal = payments.reduce((sum, p) => sum + p.amountMinor, 0n);
    if (paymentTotal !== totalMinor) {
      throw new BadRequestException({
        code: 'PAYMENT_MISMATCH',
        message: `Payments total ${paymentTotal} does not match sale total ${totalMinor}`,
      });
    }
    for (const payment of payments) {
      if (payment.method === 'CASH') {
        const tendered = payment.amountTenderedMinor ?? payment.amountMinor;
        if (tendered < payment.amountMinor) {
          throw new BadRequestException({
            code: 'INSUFFICIENT_TENDER',
            message: 'Cash tendered is less than the amount due',
          });
        }
      } else if (!payment.phoneNumber) {
        throw new BadRequestException({
          code: 'PHONE_REQUIRED',
          message: 'A phone number is required for mobile money payments',
        });
      }
    }

    // Generate sale number (documented format; uniqueness enforced by retry below)
    const saleCount = await this.prisma.sale.count({
      where: { businessId, branchId: input.branchId },
    });
    const branchCode = branch.code;
    const saleNumber = `${branchCode}-${String(saleCount + 1).padStart(6, '0')}`;
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(saleCount + 1).padStart(4, '0')}`;
    const occurredAt = new Date();

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Reserve stock inside the transaction with a conditional update. If any line
        // fails, the whole transaction rolls back.
        for (const item of pricedLines) {
          await this.inventory.decrementBalance(tx, {
            businessId,
            branchId: input.branchId,
            productVariantId: item.productVariantId,
            batchId: item.batchId,
            quantity: item.quantity,
            allowNegative,
            occurredAt,
          });
        }

        const sale = await tx.sale.create({
          data: {
            businessId,
            branchId: input.branchId,
            saleNumber,
            idempotencyKey: input.idempotencyKey,
            cashierId,
            customerId: input.customerId,
            status: 'COMPLETED',
            subtotalMinor,
            discountMinor: totalDiscountMinor,
            taxMinor,
            totalMinor,
            currency: 'UGX',
            note: input.note,
            completedAt: occurredAt,
            items: {
              create: pricedLines.map((item) => ({
                productVariantId: item.productVariantId,
                batchId: item.batchId,
                quantity: item.quantity,
                unitPriceMinor: item.unitPriceMinor,
                discountMinor: item.discountMinor,
                taxMinor: item.taxMinor,
                lineTotalMinor: item.lineTotalMinor,
                unitCostMinor: item.unitCostMinor,
              })),
            },
          },
          include: { items: true },
        });

        await tx.receipt.create({
          data: { businessId, saleId: sale.id, receiptNumber },
        });

        for (const item of pricedLines) {
          await tx.stockMovement.create({
            data: {
              businessId,
              branchId: input.branchId,
              productVariantId: item.productVariantId,
              batchId: item.batchId,
              movementType: 'SALE',
              quantityDelta: -item.quantity,
              unitCostMinor: item.unitCostMinor ?? null,
              referenceType: 'SALE',
              referenceId: sale.id,
              reason: `Sale ${saleNumber}`,
              actorUserId: cashierId,
              occurredAt,
            },
          });
        }

        for (const [i, p] of payments.entries()) {
          const isCash = p.method === 'CASH';
          const tendered = p.amountTenderedMinor ?? p.amountMinor;
          await tx.payment.create({
            data: {
              businessId,
              saleId: sale.id,
              method: p.method,
              status: isCash ? 'SUCCEEDED' : 'PENDING',
              idempotencyKey: `${input.idempotencyKey}-pay-${i}`,
              amountMinor: p.amountMinor,
              amountTenderedMinor: isCash ? tendered : null,
              changeMinor: isCash && tendered > p.amountMinor ? tendered - p.amountMinor : null,
              currency: 'UGX',
              succeededAt: isCash ? occurredAt : null,
            },
          });
        }

        await this.audit.log(tx, {
          businessId,
          actorUserId: cashierId,
          action: 'sales.sale.create',
          targetType: 'Sale',
          targetId: sale.id,
          after: { saleNumber, totalMinor: totalMinor.toString() },
        });

        return SalesService.saleResult(sale, receiptNumber, false);
      });
    } catch (error) {
      // Two concurrent requests with the same idempotency key: the loser must replay the
      // winner's sale instead of surfacing a P2002 as a 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.prisma.sale.findFirst({
          where: { businessId, idempotencyKey: input.idempotencyKey },
          include: { receipt: true },
        });
        if (winner) {
          return SalesService.saleResult(winner, winner.receipt?.receiptNumber ?? '', true);
        }
      }
      throw error;
    }
  }

  private static saleResult(
    sale: {
      id: string;
      saleNumber: string;
      status: string;
      subtotalMinor: bigint;
      discountMinor: bigint;
      taxMinor: bigint;
      totalMinor: bigint;
    },
    receiptNumber: string,
    replay: boolean,
  ) {
    return {
      id: sale.id,
      saleNumber: sale.saleNumber,
      status: sale.status,
      receiptNumber,
      subtotalMinor: Number(sale.subtotalMinor),
      discountMinor: Number(sale.discountMinor),
      taxMinor: Number(sale.taxMinor),
      totalMinor: Number(sale.totalMinor),
      replay,
    };
  }

  // ── Receipt (printable) ───────────────────────────────────────────────────
  async getReceipt(businessId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, businessId },
      include: {
        receipt: true,
        branch: true,
        payments: {
          where: { status: { in: ['SUCCEEDED', 'PENDING'] } },
          orderBy: { createdAt: 'asc' },
        },
        items: { include: { variant: { include: { product: true } } } },
      },
    });
    if (!sale || !sale.receipt) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Receipt not found' });
    }

    const [business, settings, cashier, customer] = await Promise.all([
      this.prisma.business.findUnique({ where: { id: businessId } }),
      this.prisma.businessSettings.findUnique({ where: { businessId } }),
      this.prisma.user.findUnique({ where: { id: sale.cashierId }, select: { fullName: true } }),
      sale.customerId
        ? this.prisma.customer.findUnique({ where: { id: sale.customerId } })
        : Promise.resolve(null),
    ]);

    await this.prisma.receipt.update({
      where: { id: sale.receipt.id },
      data: { printCount: { increment: 1 } },
    });

    const addr = (sale.branch.address ?? {}) as {
      street?: string;
      city?: string;
      district?: string;
    };
    const branchAddress = [addr.street, addr.city, addr.district].filter(Boolean).join(', ');

    return {
      id: sale.id,
      receiptNumber: sale.receipt.receiptNumber,
      saleNumber: sale.saleNumber,
      createdAt: (sale.completedAt ?? sale.createdAt).toISOString(),
      businessName: business?.legalName ?? '',
      branchName: sale.branch.name,
      ...(branchAddress && { branchAddress }),
      ...(sale.branch.phone && { branchPhone: sale.branch.phone }),
      ...(business?.tin && { tinNumber: business.tin }),
      ...(customer?.name && { customerName: customer.name }),
      items: sale.items.map((i) => ({
        name:
          i.variant.variantName && i.variant.variantName !== 'Default'
            ? `${i.variant.product.name} - ${i.variant.variantName}`
            : i.variant.product.name,
        qty: Number(i.quantity),
        unitPriceMinor: Number(i.unitPriceMinor),
        totalMinor: Number(i.lineTotalMinor),
      })),
      subtotalMinor: Number(sale.subtotalMinor),
      taxMinor: Number(sale.taxMinor),
      discountMinor: Number(sale.discountMinor),
      totalMinor: Number(sale.totalMinor),
      currency: sale.currency,
      payments: sale.payments.map((p) => ({
        method: p.method,
        status: p.status,
        amountMinor: Number(p.amountMinor),
        ...(p.amountTenderedMinor != null && { tenderedMinor: Number(p.amountTenderedMinor) }),
        ...(p.changeMinor != null && { changeMinor: Number(p.changeMinor) }),
      })),
      cashierName: cashier?.fullName ?? '',
      footerText: settings?.receiptFooterText ?? 'Thank you for your business!',
    };
  }

  // ── List sales ────────────────────────────────────────────────────────────
  async list(
    businessId: string,
    filters: {
      branchId?: string;
      cashierId?: string;
      page?: number;
      limit?: number;
      q?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const { page = 1, limit = 25, branchId, cashierId, q, dateFrom, dateTo } = filters;

    const where: Prisma.SaleWhereInput = {
      businessId,
      ...(branchId && { branchId }),
      ...(cashierId && { cashierId }),
      ...(dateFrom || dateTo
        ? {
            completedAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
      ...(q && {
        OR: [
          { saleNumber: { contains: q, mode: 'insensitive' } },
          { receipt: { receiptNumber: { contains: q, mode: 'insensitive' } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          receipt: true,
          branch: true,
          customer: true,
          payments: true,
          items: { include: { variant: { include: { product: true } } } },
        },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── Get one sale ──────────────────────────────────────────────────────────
  async getOne(businessId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, businessId },
      include: {
        receipt: true,
        items: { include: { variant: { include: { product: true } }, batch: true } },
        payments: true,
        refunds: { include: { items: true } },
        branch: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  // ── Refund ────────────────────────────────────────────────────────────────
  async createRefund(
    businessId: string,
    actorId: string,
    saleId: string,
    input: {
      reasonCode: string;
      items: Array<{ saleItemId: string; quantity: number; restock?: boolean }>;
    },
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, businessId },
      include: { items: true, branch: true, refunds: { include: { items: true } } },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === 'REFUNDED') {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: 'Sale is already fully refunded',
      });
    }

    // Quantities already refunded, across all completed refunds.
    const refundedByItem = new Map<string, number>();
    for (const refund of sale.refunds) {
      if (refund.status !== 'COMPLETED') continue;
      for (const item of refund.items) {
        refundedByItem.set(
          item.saleItemId,
          (refundedByItem.get(item.saleItemId) ?? 0) + Number(item.quantity),
        );
      }
    }

    const seen = new Set<string>();
    let refundTotal = 0n;
    const refundLines: Array<{
      saleItemId: string;
      quantity: number;
      amountMinor: bigint;
      restock: boolean;
      saleItem: (typeof sale.items)[number];
    }> = [];

    for (const refundItem of input.items) {
      if (seen.has(refundItem.saleItemId)) {
        throw new BadRequestException({
          code: 'DUPLICATE_REFUND_ITEM',
          message: 'The same sale item appears more than once',
        });
      }
      seen.add(refundItem.saleItemId);

      const saleItem = sale.items.find((i) => i.id === refundItem.saleItemId);
      if (!saleItem) throw new BadRequestException(`Sale item ${refundItem.saleItemId} not found`);

      const soldQty = Number(saleItem.quantity);
      const alreadyRefunded = refundedByItem.get(saleItem.id) ?? 0;
      const refundable = soldQty - alreadyRefunded;
      if (refundItem.quantity <= 0 || refundItem.quantity > refundable) {
        throw new BadRequestException({
          code: 'OVER_REFUND_QUANTITY',
          message: `Cannot refund ${refundItem.quantity}; ${refundable} remains refundable`,
        });
      }

      // Refund the tax-inclusive line total proportionally to the returned quantity.
      const qtyThousand = BigInt(Math.round(refundItem.quantity * 1000));
      const soldThousand = BigInt(Math.round(soldQty * 1000));
      const amountMinor = (saleItem.lineTotalMinor * qtyThousand) / soldThousand;
      refundTotal += amountMinor;
      refundLines.push({
        saleItemId: saleItem.id,
        quantity: refundItem.quantity,
        amountMinor,
        restock: refundItem.restock ?? true,
        saleItem,
      });
    }

    const remaining = sale.totalMinor - sale.refundedTotalMinor;
    if (refundTotal > remaining) {
      throw new BadRequestException({
        code: 'OVER_REFUND_AMOUNT',
        message: 'Refund exceeds the remaining value of the sale',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          businessId,
          saleId,
          status: 'COMPLETED',
          reasonCode: input.reasonCode,
          refundTotalMinor: refundTotal,
          approvedBy: actorId,
          completedAt: new Date(),
          items: {
            create: refundLines.map((line) => ({
              saleItemId: line.saleItemId,
              quantity: line.quantity,
              amountMinor: line.amountMinor,
              restock: line.restock,
            })),
          },
        },
      });

      const totalRefunded = sale.refundedTotalMinor + refundTotal;
      await tx.sale.update({
        where: { id: saleId },
        data: {
          refundedTotalMinor: totalRefunded,
          status: totalRefunded >= sale.totalMinor ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });

      for (const line of refundLines.filter((l) => l.restock)) {
        await tx.stockMovement.create({
          data: {
            businessId,
            branchId: sale.branchId,
            productVariantId: line.saleItem.productVariantId,
            batchId: line.saleItem.batchId,
            movementType: 'SALE_REVERSAL',
            quantityDelta: line.quantity,
            referenceType: 'REFUND',
            referenceId: refund.id,
            reason: `Refund of sale ${sale.saleNumber}`,
            actorUserId: actorId,
            occurredAt: new Date(),
          },
        });
        await this.inventory.upsertBalance(tx, {
          businessId,
          branchId: sale.branchId,
          productVariantId: line.saleItem.productVariantId,
          batchId: line.saleItem.batchId,
          delta: line.quantity,
          occurredAt: new Date(),
        });
      }

      return refund;
    });
  }
}
