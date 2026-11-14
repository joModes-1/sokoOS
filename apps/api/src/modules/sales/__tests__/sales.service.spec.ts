/**
 * Unit tests for SalesService
 * Key scenarios: idempotency, stock availability, total computation, FEFO batch selection
 */
import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../sales.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { InventoryService } from '../../inventory/inventory.service';
import { AuditService } from '../../audit/audit.service';
import type { CommitSaleInput } from '@sokoos/shared';

describe('SalesService', () => {
  let service: SalesService;
  let prisma: {
    sale: { findFirst: jest.Mock; count: jest.Mock; create: jest.Mock; update: jest.Mock };
    productVariant: { findFirst: jest.Mock };
    stockBatch: { findFirst: jest.Mock };
    inventoryBalance: { findFirst: jest.Mock };
    businessSettings: { findUnique: jest.Mock };
    branch: { findFirst: jest.Mock };
    receipt: { create: jest.Mock };
    refund: { create: jest.Mock };
    stockMovement: { create: jest.Mock };
    payment: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let inventory: { upsertBalance: jest.Mock; decrementBalance: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      sale: {
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productVariant: { findFirst: jest.fn() },
      stockBatch: { findFirst: jest.fn() },
      inventoryBalance: { findFirst: jest.fn() },
      businessSettings: { findUnique: jest.fn() },
      branch: { findFirst: jest.fn() },
      receipt: { create: jest.fn() },
      refund: { create: jest.fn() },
      stockMovement: { create: jest.fn() },
      payment: { create: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    inventory = { upsertBalance: jest.fn(), decrementBalance: jest.fn() };
    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventory },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  describe('commitSale', () => {
    const baseInput = {
      branchId: 'branch-1',
      idempotencyKey: 'key-123',
      items: [
        { productVariantId: 'var-1', quantity: 2, discountMinor: 0n },
      ],
    } as CommitSaleInput;

    it('returns existing sale when idempotency key already committed', async () => {
      const existingSale = {
        id: 'sale-1',
        idempotencyKey: 'key-123',
        status: 'COMPLETED',
        receipt: { id: 'rcp-1' },
      };
      prisma.sale.findFirst.mockResolvedValue(existingSale);

      const result = await service.commitSale('biz-1', 'user-1', baseInput);

      expect(result.replay).toBe(true);
      expect(result.id).toBe(existingSale.id);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws when branch is not found or inactive', async () => {
      prisma.sale.findFirst.mockResolvedValue(null);
      prisma.branch.findFirst.mockResolvedValue(null);

      await expect(
        service.commitSale('biz-1', 'user-1', baseInput),
      ).rejects.toThrow('Branch not found or inactive');
    });

    it('throws when product variant is not found', async () => {
      prisma.sale.findFirst.mockResolvedValue(null);
      prisma.branch.findFirst.mockResolvedValue({
        id: 'branch-1',
        code: 'BR-01',
        allowNegativeStock: false,
      });
      prisma.productVariant.findFirst.mockResolvedValue(null);

      await expect(
        service.commitSale('biz-1', 'user-1', baseInput),
      ).rejects.toThrow();
    });

    function mockResolvableSale() {
      prisma.sale.findFirst.mockResolvedValue(null);
      prisma.branch.findFirst.mockResolvedValue({
        id: 'branch-1',
        code: 'BR-01',
        allowNegativeStock: false,
      });
      prisma.businessSettings.findUnique.mockResolvedValue({ allowNegativeStock: false });
      prisma.productVariant.findFirst.mockResolvedValue({
        id: 'var-1',
        sellingPriceMinor: 1000n,
        costPriceMinor: 500n,
        product: {
          name: 'Soap',
          sellingPriceMinor: 1000n,
          costPriceMinor: 500n,
          taxRateBp: 0,
          isBatchTracked: false,
        },
      });
      prisma.inventoryBalance.findFirst.mockResolvedValue({ quantityOnHand: 10n });
      prisma.sale.count.mockResolvedValue(0);
      prisma.sale.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        id: 'sale-1',
        saleNumber: data.saleNumber,
        status: 'COMPLETED',
        subtotalMinor: data.subtotalMinor,
        discountMinor: data.discountMinor,
        taxMinor: data.taxMinor,
        totalMinor: data.totalMinor,
      }));
    }

    it('rejects payments that do not cover the sale', async () => {
      mockResolvableSale();

      await expect(
        service.commitSale('biz-1', 'user-1', {
          ...baseInput,
          payments: [{ method: 'CASH', amountMinor: 500n }],
        }),
      ).rejects.toMatchObject({ response: { code: 'PAYMENT_MISMATCH' } });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('keeps the line totals equal to the sale total and reserves stock atomically', async () => {
      mockResolvableSale();

      const result = await service.commitSale('biz-1', 'user-1', {
        ...baseInput,
        discountMinor: 100n,
        payments: [{ method: 'CASH', amountMinor: 1900n, amountTenderedMinor: 2000n }],
      });

      expect(result.totalMinor).toBe(1900);
      const createArgs = prisma.sale.create.mock.calls[0][0] as {
        data: { totalMinor: bigint; items: { create: { lineTotalMinor: bigint }[] } };
      };
      const lineSum = createArgs.data.items.create.reduce((sum, i) => sum + i.lineTotalMinor, 0n);
      expect(lineSum).toBe(createArgs.data.totalMinor);
      expect(inventory.decrementBalance).toHaveBeenCalledTimes(1);
    });
  });

  describe('createRefund', () => {
    const sale = {
      id: 'sale-1',
      businessId: 'biz-1',
      branchId: 'branch-1',
      saleNumber: 'S-1',
      status: 'PARTIALLY_REFUNDED',
      totalMinor: 1180n,
      refundedTotalMinor: 590n,
      items: [
        {
          id: 'si-1',
          quantity: 2,
          lineTotalMinor: 1180n,
          productVariantId: 'var-1',
          batchId: null,
        },
      ],
      refunds: [{ status: 'COMPLETED', items: [{ saleItemId: 'si-1', quantity: 1 }] }],
    };

    it('rejects refunding more than the remaining sold quantity', async () => {
      prisma.sale.findFirst.mockResolvedValue(sale);

      await expect(
        service.createRefund('biz-1', 'user-1', 'sale-1', {
          reasonCode: 'CUSTOMER_REQUEST',
          items: [{ saleItemId: 'si-1', quantity: 2 }],
        }),
      ).rejects.toMatchObject({ response: { code: 'OVER_REFUND_QUANTITY' } });
      expect(prisma.refund.create).not.toHaveBeenCalled();
    });

    it('records the tax-inclusive refund amount for a partial refund', async () => {
      prisma.sale.findFirst.mockResolvedValue(sale);
      prisma.refund.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        id: 'refund-1',
        ...data,
      }));

      await service.createRefund('biz-1', 'user-1', 'sale-1', {
        reasonCode: 'CUSTOMER_REQUEST',
        items: [{ saleItemId: 'si-1', quantity: 1 }],
      });

      const createArgs = prisma.refund.create.mock.calls[0][0] as {
        data: { refundTotalMinor: bigint; items: { create: { amountMinor: bigint }[] } };
      };
      expect(createArgs.data.refundTotalMinor).toBe(590n);
      expect(createArgs.data.items.create[0].amountMinor).toBe(590n);
    });
  });
});
