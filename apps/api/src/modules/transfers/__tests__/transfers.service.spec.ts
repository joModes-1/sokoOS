import { TransfersService } from '../transfers.service.js';

describe('TransfersService', () => {
  let service: TransfersService;
  let prisma: {
    stockTransfer: { findFirst: jest.Mock; update: jest.Mock };
    inventoryBalance: { findFirst: jest.Mock };
    inventory: unknown;
    $transaction: jest.Mock;
  };
  let inventory: { decrementBalance: jest.Mock; upsertBalance: jest.Mock };

  beforeEach(() => {
    prisma = {
      stockTransfer: { findFirst: jest.fn(), update: jest.fn() },
      inventoryBalance: { findFirst: jest.fn() },
      inventory: undefined,
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    inventory = { decrementBalance: jest.fn(), upsertBalance: jest.fn() };
    const audit = { log: jest.fn() };

    service = new TransfersService(prisma as never, inventory as never, audit as never);
  });

  it('rejects approval when the origin branch lacks stock', async () => {
    prisma.stockTransfer.findFirst.mockResolvedValue({
      id: 'transfer-1',
      status: 'REQUESTED',
      originBranchId: 'branch-1',
      items: [{ productVariantId: 'variant-1', batchId: null, requestedQuantity: 5 }],
    });
    prisma.inventoryBalance.findFirst.mockResolvedValue({ quantityOnHand: 2n });

    await expect(service.approve('biz-1', 'user-1', 'transfer-1')).rejects.toMatchObject({
      response: { code: 'INSUFFICIENT_STOCK' },
    });
    expect(prisma.stockTransfer.update).not.toHaveBeenCalled();
  });

  it('only closes a RECEIVED transfer', async () => {
    prisma.stockTransfer.findFirst.mockResolvedValue({ id: 'transfer-1', status: 'DISPATCHED' });

    await expect(service.close('biz-1', 'user-1', 'transfer-1')).rejects.toMatchObject({
      response: { code: 'INVALID_STATE_TRANSITION' },
    });
    expect(prisma.stockTransfer.update).not.toHaveBeenCalled();
  });

  it('rejects receiving more than was dispatched', async () => {
    prisma.stockTransfer.findFirst.mockResolvedValue({
      id: 'transfer-1',
      status: 'DISPATCHED',
      items: [
        {
          id: 'item-1',
          productVariantId: 'variant-1',
          batchId: null,
          requestedQuantity: 5,
          dispatchedQuantity: 5,
        },
      ],
    });

    await expect(
      service.receive('biz-1', 'user-1', 'transfer-1', [
        { transferItemId: 'item-1', receivedQuantity: 6 },
      ]),
    ).rejects.toMatchObject({ response: { code: 'OVER_RECEIPT' } });
  });
});
