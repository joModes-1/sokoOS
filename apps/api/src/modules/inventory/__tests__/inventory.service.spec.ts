/**
 * Unit tests for InventoryService
 * Key scenarios: immutable ledger, balance projection, adjustment validation
 */
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from '../inventory.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type { StockAdjustmentInput } from '@sokoos/shared';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    branch: { findFirst: jest.Mock };
    inventoryBalance: { findFirst: jest.Mock; update: jest.Mock };
    businessSettings: { findUnique: jest.Mock };
    stockMovement: { create: jest.Mock };
    stockAdjustment: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    prisma = {
      branch: { findFirst: jest.fn() },
      inventoryBalance: { findFirst: jest.fn(), update: jest.fn() },
      businessSettings: { findUnique: jest.fn() },
      stockMovement: { create: jest.fn() },
      stockAdjustment: { create: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('createAdjustment', () => {
    const baseInput: StockAdjustmentInput = {
      branchId: 'branch-1',
      productVariantId: 'var-1',
      quantityDelta: -5,
      reasonCode: 'DAMAGE',
      reasonText: 'Found 5 damaged during count',
    };

    it('requires a non-empty reasonText', async () => {
      prisma.branch.findFirst.mockResolvedValue({ id: 'branch-1', businessId: 'biz-1' });

      await expect(
        service.createAdjustment('biz-1', 'user-1', {
          ...baseInput,
          reasonText: '', // empty!
        }),
      ).rejects.toThrow();
    });

    it('prevents negative stock when business does not allow it', async () => {
      prisma.branch.findFirst.mockResolvedValue({
        id: 'branch-1',
        businessId: 'biz-1',
        allowNegativeStock: false,
      });
      prisma.inventoryBalance.findFirst.mockResolvedValue({
        quantityOnHand: 2n,
        productVariantId: 'var-1',
        branchId: 'branch-1',
        businessId: 'biz-1',
      });
      prisma.businessSettings.findUnique.mockResolvedValue({
        allowNegativeStock: false,
      });

      await expect(
        service.createAdjustment('biz-1', 'user-1', {
          ...baseInput,
          quantityDelta: -10, // Would bring to -8
        }),
      ).rejects.toThrow();
    });

    it('creates an adjustment and updates balance when stock is sufficient', async () => {
      prisma.branch.findFirst.mockResolvedValue({
        id: 'branch-1',
        businessId: 'biz-1',
        allowNegativeStock: false,
      });
      prisma.inventoryBalance.findFirst.mockResolvedValue({
        quantityOnHand: 10n,
        productVariantId: 'var-1',
        branchId: 'branch-1',
        businessId: 'biz-1',
      });
      prisma.businessSettings.findUnique.mockResolvedValue({
        allowNegativeStock: false,
      });
      prisma.stockMovement.create.mockResolvedValue({ id: 'mov-1' });
      prisma.stockAdjustment.create.mockResolvedValue({ id: 'adj-1' });

      const result = await service.createAdjustment('biz-1', 'user-1', baseInput);

      expect(result).toBeDefined();
      expect(prisma.stockMovement.create).toHaveBeenCalled();
      expect(prisma.stockAdjustment.create).toHaveBeenCalled();
    });
  });
});
