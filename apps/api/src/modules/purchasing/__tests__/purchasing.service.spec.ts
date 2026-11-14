import { PurchasingService } from '../purchasing.service.js';
import type { GoodsReceiptCreateInput } from '@sokoos/shared';

describe('PurchasingService goods receipts', () => {
  let service: PurchasingService;
  let prisma: {
    purchaseOrder: { findFirst: jest.Mock };
    goodsReceipt: { count: jest.Mock };
    $transaction: jest.Mock;
  };

  const baseInput: GoodsReceiptCreateInput = {
    purchaseOrderId: 'po-1',
    overReceiptConfirmed: false,
    items: [
      {
        purchaseOrderItemId: 'poi-1',
        productVariantId: 'variant-1',
        quantityReceived: 2,
        unitCostMinor: 1000n,
        overReceiptConfirmed: false,
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      purchaseOrder: { findFirst: jest.fn() },
      goodsReceipt: { count: jest.fn() },
      $transaction: jest.fn(),
    };
    const inventory = { upsertBalance: jest.fn() };
    const audit = { log: jest.fn() };
    service = new PurchasingService(prisma as never, inventory as never, audit as never);
  });

  it('rejects over-receipt unless it is explicitly confirmed', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue({
      id: 'po-1',
      status: 'CONFIRMED',
      supplierId: 'supplier-1',
      branchId: 'branch-1',
      items: [
        {
          id: 'poi-1',
          productVariantId: 'variant-1',
          quantityOrdered: 5,
          quantityReceived: 4,
        },
      ],
    });

    await expect(
      service.createGoodsReceipt('biz-1', 'user-1', baseInput),
    ).rejects.toMatchObject({ response: { code: 'OVER_RECEIPT' } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a PO line that does not belong to the purchase order', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue({
      id: 'po-1',
      status: 'CONFIRMED',
      supplierId: 'supplier-1',
      branchId: 'branch-1',
      items: [
        {
          id: 'different-line',
          productVariantId: 'variant-1',
          quantityOrdered: 5,
          quantityReceived: 0,
        },
      ],
    });

    await expect(
      service.createGoodsReceipt('biz-1', 'user-1', baseInput),
    ).rejects.toMatchObject({ response: { code: 'PO_ITEM_NOT_FOUND' } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a variant that does not match the PO line', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue({
      id: 'po-1',
      status: 'CONFIRMED',
      supplierId: 'supplier-1',
      branchId: 'branch-1',
      items: [
        {
          id: 'poi-1',
          productVariantId: 'variant-OTHER',
          quantityOrdered: 5,
          quantityReceived: 0,
        },
      ],
    });

    await expect(
      service.createGoodsReceipt('biz-1', 'user-1', baseInput),
    ).rejects.toMatchObject({ response: { code: 'VARIANT_MISMATCH' } });
  });
});
