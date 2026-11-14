import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { SupplierInput, PurchaseOrderCreateInput, GoodsReceiptCreateInput } from '@sokoos/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class PurchasingService {
  constructor(private prisma: PrismaService, private inventory: InventoryService, private audit: AuditService) {}

  // ── Suppliers ─────────────────────────────────────────────────────────────
  async listSuppliers(businessId: string, q?: string) {
    return this.prisma.supplier.findMany({
      where: { businessId, deletedAt: null, ...(q && { name: { contains: q, mode: 'insensitive' } }) },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(businessId: string, input: SupplierInput) {
    const exists = await this.prisma.supplier.findFirst({ where: { businessId, name: { equals: input.name, mode: 'insensitive' }, deletedAt: null } });
    if (exists) throw new ConflictException({ code: 'DUPLICATE_SUPPLIER_NAME', message: `Supplier "${input.name}" already exists` });
    return this.prisma.supplier.create({ data: { businessId, ...input } });
  }

  // ── Purchase Orders ───────────────────────────────────────────────────────
  async listPurchaseOrders(businessId: string, filters: { supplierId?: string; branchId?: string; status?: string; page?: number; limit?: number }) {
    const { page = 1, limit = 25, supplierId, branchId, status } = filters;
    const where: Prisma.PurchaseOrderWhereInput = {
      businessId, deletedAt: null,
      ...(supplierId && { supplierId }),
      ...(branchId && { branchId }),
      ...(status && { status: status as never }),
    };
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { supplier: true, branch: true, items: { include: { variant: { include: { product: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async createPurchaseOrder(businessId: string, userId: string, input: PurchaseOrderCreateInput) {
    const [supplier, branch] = await Promise.all([
      this.prisma.supplier.findFirst({ where: { id: input.supplierId, businessId, deletedAt: null } }),
      this.prisma.branch.findFirst({ where: { id: input.branchId, businessId, deletedAt: null } }),
    ]);
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!branch) throw new NotFoundException('Branch not found');

    const variantIds = [...new Set(input.items.map((i) => i.productVariantId))];
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, businessId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    if (variants.length !== variantIds.length) {
      throw new NotFoundException('One or more product variants were not found');
    }

    const count = await this.prisma.purchaseOrder.count({ where: { businessId } });
    const poNumber = `PO-${String(count + 1).padStart(4, '0')}`;

    // Compute totals
    let subtotalMinor = 0n;
    let taxMinor = 0n;
    for (const item of input.items) {
      const lineTotal = item.unitCostMinor * BigInt(Math.round(item.quantityOrdered * 1000)) / 1000n;
      const lineTax = lineTotal * BigInt(item.taxRateBp ?? 0) / 10000n;
      subtotalMinor += lineTotal;
      taxMinor += lineTax;
    }
    const totalMinor = subtotalMinor + taxMinor;

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          businessId, branchId: input.branchId, supplierId: input.supplierId,
          poNumber, status: 'DRAFT',
          subtotalMinor, taxMinor, totalMinor,
          currency: 'UGX',
          expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
          note: input.note,
          items: {
            create: input.items.map(item => ({
              productVariantId: item.productVariantId,
              quantityOrdered: item.quantityOrdered,
              unitCostMinor: item.unitCostMinor,
              taxRateBp: item.taxRateBp ?? 0,
              lineTotalMinor: item.unitCostMinor * BigInt(Math.round(item.quantityOrdered * 1000)) / 1000n,
            })),
          },
        },
        include: { items: true, supplier: true, branch: true },
      });

      await this.audit.log(tx, { businessId, actorUserId: userId, action: 'po.create', targetType: 'PurchaseOrder', targetId: po.id });
      return po;
    });
  }

  async getPurchaseOrder(businessId: string, poId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, businessId, deletedAt: null },
      include: {
        supplier: true,
        branch: true,
        items: { include: { variant: { include: { product: true } } } },
        goodsReceipts: { include: { items: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async transitionPo(businessId: string, userId: string, poId: string, action: 'submit' | 'confirm' | 'cancel' | 'close') {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id: poId, businessId, deletedAt: null } });
    if (!po) throw new NotFoundException('Purchase order not found');

    const transitions: Record<string, Record<string, string>> = {
      submit: { DRAFT: 'SUBMITTED' },
      confirm: { SUBMITTED: 'CONFIRMED' },
      cancel: { DRAFT: 'CANCELLED', SUBMITTED: 'CANCELLED', CONFIRMED: 'CANCELLED' },
      close: { RECEIVED: 'CLOSED', PARTIALLY_RECEIVED: 'CLOSED' },
    };

    const allowedFrom = transitions[action];
    if (!allowedFrom || !allowedFrom[po.status]) {
      throw new ConflictException({ code: 'INVALID_STATE_TRANSITION', message: `Cannot ${action} a ${po.status} purchase order` });
    }

    const data: Prisma.PurchaseOrderUpdateInput = { status: allowedFrom[po.status] as never };
    if (action === 'submit') { data.submittedBy = userId; data.submittedAt = new Date(); }
    if (action === 'confirm') { data.confirmedBy = userId; data.confirmedAt = new Date(); }
    if (action === 'close') { data.closedBy = userId; data.closedAt = new Date(); }

    return this.prisma.purchaseOrder.update({ where: { id: poId }, data });
  }

  // ── Goods Receipts ────────────────────────────────────────────────────────
  async createGoodsReceipt(businessId: string, userId: string, input: GoodsReceiptCreateInput) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: input.purchaseOrderId, businessId },
      include: { items: true, branch: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (!['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: 'Can only receive against CONFIRMED or PARTIALLY_RECEIVED POs',
      });
    }

    // Validate every line against the PO before writing anything. Over-receipt is only
    // allowed when explicitly confirmed; unknown or mismatched PO lines are rejected.
    const poItems = new Map(po.items.map((item) => [item.id, item]));
    const seen = new Set<string>();
    const overReceiptLines: Array<{ purchaseOrderItemId: string; ordered: number; received: number }> = [];

    for (const item of input.items) {
      if (seen.has(item.purchaseOrderItemId)) {
        throw new ConflictException({
          code: 'DUPLICATE_RECEIPT_LINE',
          message: 'The same purchase order line appears more than once',
        });
      }
      seen.add(item.purchaseOrderItemId);

      const poItem = poItems.get(item.purchaseOrderItemId);
      if (!poItem) {
        throw new ConflictException({
          code: 'PO_ITEM_NOT_FOUND',
          message: `Purchase order line ${item.purchaseOrderItemId} does not belong to this PO`,
        });
      }
      if (poItem.productVariantId !== item.productVariantId) {
        throw new ConflictException({
          code: 'VARIANT_MISMATCH',
          message: 'Received variant does not match the purchase order line',
        });
      }
      const ordered = Number(poItem.quantityOrdered);
      const cumulative = Number(poItem.quantityReceived) + item.quantityReceived;
      const over = cumulative > ordered;
      if (over && !input.overReceiptConfirmed && !item.overReceiptConfirmed) {
        overReceiptLines.push({ purchaseOrderItemId: poItem.id, ordered, received: cumulative });
      }
    }

    if (overReceiptLines.length > 0) {
      throw new ConflictException({
        code: 'OVER_RECEIPT',
        message: 'Received quantity exceeds the ordered quantity; confirm over-receipt first',
        details: overReceiptLines,
      });
    }

    const count = await this.prisma.goodsReceipt.count({ where: { businessId } });
    const receiptNumber = `GRN-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const gr = await tx.goodsReceipt.create({
        data: {
          businessId,
          purchaseOrderId: input.purchaseOrderId,
          receiptNumber,
          status: 'POSTED',
          receivedBy: userId,
          overReceiptConfirmed: input.overReceiptConfirmed,
          note: input.note,
          items: {
            create: input.items.map((i) => ({
              productVariantId: i.productVariantId,
              purchaseOrderItemId: i.purchaseOrderItemId,
              quantityReceived: i.quantityReceived,
              unitCostMinor: i.unitCostMinor,
              batchNumber: i.batchNumber,
              expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
              isOverReceipt:
                Number(poItems.get(i.purchaseOrderItemId)!.quantityReceived) +
                  i.quantityReceived >
                Number(poItems.get(i.purchaseOrderItemId)!.quantityOrdered),
            })),
          },
        },
        include: { items: true },
      });

      for (const grItem of input.items) {
        const poItem = poItems.get(grItem.purchaseOrderItemId)!;
        const newReceived = Number(poItem.quantityReceived) + grItem.quantityReceived;
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { quantityReceived: newReceived },
        });

        if (grItem.batchNumber) {
          await tx.stockBatch.upsert({
            where: {
              businessId_productVariantId_batchNumber: {
                businessId,
                productVariantId: grItem.productVariantId,
                batchNumber: grItem.batchNumber,
              },
            },
            create: {
              businessId,
              productVariantId: grItem.productVariantId,
              batchNumber: grItem.batchNumber,
              expiryDate: grItem.expiryDate ? new Date(grItem.expiryDate) : null,
              supplierId: po.supplierId,
              status: 'ACTIVE',
            },
            update: {},
          });
        }

        const batch = grItem.batchNumber
          ? await tx.stockBatch.findFirst({
              where: {
                businessId,
                productVariantId: grItem.productVariantId,
                batchNumber: grItem.batchNumber,
              },
            })
          : null;
        await tx.stockMovement.create({
          data: {
            businessId,
            branchId: po.branchId,
            productVariantId: grItem.productVariantId,
            batchId: batch?.id,
            movementType: 'GOODS_RECEIPT',
            quantityDelta: grItem.quantityReceived,
            unitCostMinor: grItem.unitCostMinor,
            referenceType: 'GOODS_RECEIPT',
            referenceId: gr.id,
            reason: `Goods receipt ${receiptNumber}`,
            actorUserId: userId,
            occurredAt: new Date(),
          },
        });

        await this.inventory.upsertBalance(tx, {
          businessId,
          branchId: po.branchId,
          productVariantId: grItem.productVariantId,
          batchId: batch?.id,
          delta: grItem.quantityReceived,
          occurredAt: new Date(),
        });
      }

      // Status is based on every PO line, not only the lines in this receipt.
      const allItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: input.purchaseOrderId },
      });
      const complete = allItems.every(
        (item) => Number(item.quantityReceived) >= Number(item.quantityOrdered),
      );
      await tx.purchaseOrder.update({
        where: { id: input.purchaseOrderId },
        data: { status: complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
      });

      return gr;
    });
  }
}
