import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { StockTransferCreateInput } from '@sokoos/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransfersService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private audit: AuditService,
  ) {}

  async create(businessId: string, userId: string, input: StockTransferCreateInput) {
    if (input.originBranchId === input.destinationBranchId) {
      throw new ConflictException({
        code: 'INVALID_TRANSFER',
        message: 'Origin and destination branches must be different',
      });
    }
    const branches = await this.prisma.branch.findMany({
      where: {
        id: { in: [input.originBranchId, input.destinationBranchId] },
        businessId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (branches.length !== 2) throw new NotFoundException('Origin or destination branch not found');

    const variantIds = [...new Set(input.items.map((i) => i.productVariantId))];
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, businessId, deletedAt: null },
      select: { id: true },
    });
    if (variants.length !== variantIds.length) {
      throw new NotFoundException('One or more product variants were not found');
    }

    const count = await this.prisma.stockTransfer.count({ where: { businessId } });
    const transferNumber = `TR-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          businessId,
          transferNumber,
          originBranchId: input.originBranchId,
          destinationBranchId: input.destinationBranchId,
          status: 'REQUESTED',
          requestedBy: userId,
          note: input.note,
          items: {
            create: input.items.map(i => ({
              productVariantId: i.productVariantId,
              batchId: i.batchId,
              requestedQuantity: i.requestedQuantity,
            })),
          },
        },
        include: { items: true, originBranch: true, destinationBranch: true },
      });

      await this.audit.log(tx, { businessId, actorUserId: userId, action: 'transfer.create', targetType: 'StockTransfer', targetId: transfer.id });
      return transfer;
    });
  }

  async approve(businessId: string, userId: string, transferId: string) {
    const transfer = await this.getOne(businessId, transferId);
    if (transfer.status !== 'REQUESTED') throw new ConflictException({ code: 'INVALID_STATE_TRANSITION', message: `Transfer is ${transfer.status}` });

    // Check availability at source
    const conflicts: Array<{ product: string; available: number; requested: number }> = [];
    for (const item of transfer.items) {
      const balance = await this.prisma.inventoryBalance.findFirst({
        where: { businessId, branchId: transfer.originBranchId, productVariantId: item.productVariantId, batchId: item.batchId ?? null },
      });
      const available = Number(balance?.quantityOnHand ?? 0);
      if (available < Number(item.requestedQuantity)) {
        conflicts.push({ product: item.productVariantId, available, requested: Number(item.requestedQuantity) });
      }
    }

    if (conflicts.length > 0) {
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Origin branch does not have enough stock for this transfer',
        details: conflicts,
      });
    }

    return this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
    });
  }

  async reject(businessId: string, userId: string, transferId: string, reason: string) {
    const transfer = await this.getOne(businessId, transferId);
    if (transfer.status !== 'REQUESTED') throw new ConflictException({ code: 'INVALID_STATE_TRANSITION', message: `Transfer is ${transfer.status}` });

    return this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: { status: 'REJECTED', rejectedBy: userId, rejectedAt: new Date(), rejectionReason: reason },
    });
  }

  async dispatch(businessId: string, userId: string, transferId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id: transferId, businessId },
      include: { items: true, originBranch: true },
    });
    if (!transfer || transfer.status !== 'APPROVED') {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: 'Transfer must be APPROVED before dispatch',
      });
    }

    const settings = await this.prisma.businessSettings.findUnique({ where: { businessId } });
    const allowNegative = transfer.originBranch.allowNegativeStock ?? settings?.allowNegativeStock ?? false;

    return this.prisma.$transaction(async (tx) => {
      // Deduct from origin atomically; re-checks stock at dispatch time.
      for (const item of transfer.items) {
        const qty = Number(item.requestedQuantity);
        await this.inventory.decrementBalance(tx, {
          businessId,
          branchId: transfer.originBranchId,
          productVariantId: item.productVariantId,
          batchId: item.batchId,
          quantity: qty,
          allowNegative,
          occurredAt: new Date(),
        });
        await tx.stockMovement.create({
          data: {
            businessId, branchId: transfer.originBranchId,
            productVariantId: item.productVariantId, batchId: item.batchId,
            movementType: 'TRANSFER_OUT', quantityDelta: -qty,
            referenceType: 'STOCK_TRANSFER', referenceId: transferId,
            reason: `Dispatched on transfer ${transfer.transferNumber}`,
            actorUserId: userId, occurredAt: new Date(),
          },
        });
        await tx.stockTransferItem.update({
          where: { id: item.id }, data: { dispatchedQuantity: qty },
        });
      }

      return tx.stockTransfer.update({
        where: { id: transferId },
        data: { status: 'DISPATCHED', dispatchedBy: userId, dispatchedAt: new Date() },
      });
    });
  }

  async receive(businessId: string, userId: string, transferId: string, items: Array<{ transferItemId: string; receivedQuantity: number; shortfallNote?: string }>) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id: transferId, businessId },
      include: { items: true },
    });
    if (!transfer || transfer.status !== 'DISPATCHED') {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: 'Transfer must be DISPATCHED before receiving',
      });
    }

    const receivedById = new Map<string, { receivedQuantity: number; shortfallNote?: string }>();
    for (const recv of items) {
      const item = transfer.items.find((i) => i.id === recv.transferItemId);
      if (!item) {
        throw new BadRequestException(`Transfer item ${recv.transferItemId} does not belong to this transfer`);
      }
      if (receivedById.has(recv.transferItemId)) {
        throw new BadRequestException('The same transfer item appears more than once');
      }
      const dispatched = Number(item.dispatchedQuantity ?? item.requestedQuantity);
      if (recv.receivedQuantity < 0 || recv.receivedQuantity > dispatched) {
        throw new BadRequestException({
          code: 'OVER_RECEIPT',
          message: `Cannot receive ${recv.receivedQuantity}; ${dispatched} was dispatched`,
        });
      }
      receivedById.set(recv.transferItemId, recv);
    }
    for (const item of transfer.items) {
      if (!receivedById.has(item.id)) {
        throw new BadRequestException(`Transfer item ${item.id} was not counted`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const recv = receivedById.get(item.id)!;
        const qty = recv.receivedQuantity;
        const dispatched = Number(item.dispatchedQuantity ?? item.requestedQuantity);
        const shortfall = dispatched - qty;

        await tx.stockMovement.create({
          data: {
            businessId, branchId: transfer.destinationBranchId,
            productVariantId: item.productVariantId, batchId: item.batchId,
            movementType: 'TRANSFER_IN', quantityDelta: qty,
            referenceType: 'STOCK_TRANSFER', referenceId: transferId,
            reason: `Received from transfer ${transfer.transferNumber}`,
            actorUserId: userId, occurredAt: new Date(),
          },
        });
        await this.inventory.upsertBalance(tx, {
          businessId, branchId: transfer.destinationBranchId,
          productVariantId: item.productVariantId, batchId: item.batchId,
          delta: qty, occurredAt: new Date(),
        });
        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { receivedQuantity: qty, shortfallQuantity: shortfall > 0 ? shortfall : null, note: recv.shortfallNote },
        });
      }

      return tx.stockTransfer.update({
        where: { id: transferId },
        data: { status: 'RECEIVED', receivedBy: userId, receivedAt: new Date() },
      });
    });
  }

  async close(businessId: string, userId: string, transferId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id: transferId, businessId },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== 'RECEIVED') {
      throw new ConflictException({
        code: 'INVALID_STATE_TRANSITION',
        message: `Only a RECEIVED transfer can be closed (current: ${transfer.status})`,
      });
    }

    return this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: { status: 'CLOSED', closedBy: userId, closedAt: new Date() },
    });
  }

  async list(businessId: string, filters: { branchId?: string; status?: string; page?: number; limit?: number }) {
    const { page = 1, limit = 25, branchId, status } = filters;
    const where: Prisma.StockTransferWhereInput = {
      businessId,
      ...(status && { status: status as never }),
      ...(branchId && { OR: [{ originBranchId: branchId }, { destinationBranchId: branchId }] }),
    };
    const [data, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { originBranch: true, destinationBranch: true, items: { include: { variant: { include: { product: true } } } } },
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getOne(businessId: string, transferId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id: transferId, businessId },
      include: { items: { include: { variant: { include: { product: true } }, batch: true } }, originBranch: true, destinationBranch: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    return transfer;
  }
}
