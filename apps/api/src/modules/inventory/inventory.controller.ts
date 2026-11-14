import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { StockAdjustmentSchema } from '@sokoos/shared';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Get('balances')
  @RequirePermissions('inventory.view')
  async getBalances(@CurrentUser() user: AuthUser, @Query() q: Record<string, string>) {
    return this.inventory.getBalances(user.businessId!, {
      branchId: q['branchId'],
      lowStockOnly: q['lowStockOnly'] === 'true',
      page: parseInt(q['page'] ?? '1'),
      limit: parseInt(q['limit'] ?? '25'),
      q: q['q'],
    });
  }

  @Get('movements')
  @RequirePermissions('inventory.view')
  async getMovements(@CurrentUser() user: AuthUser, @Query() q: Record<string, string>) {
    return this.inventory.getMovements(user.businessId!, {
      branchId: q['branchId'],
      productVariantId: q['productVariantId'],
      page: parseInt(q['page'] ?? '1'),
      limit: parseInt(q['limit'] ?? '25'),
    });
  }

  @Get('batches')
  @RequirePermissions('inventory.view')
  async getBatches(@CurrentUser() user: AuthUser, @Query() q: Record<string, string>) {
    return this.inventory.getBatches(user.businessId!, {
      branchId: q['branchId'],
      expired: q['expired'] === 'true' ? true : q['expired'] === 'false' ? false : undefined,
      page: parseInt(q['page'] ?? '1'),
      limit: parseInt(q['limit'] ?? '25'),
    });
  }

  @Get('low-stock')
  @RequirePermissions('inventory.view')
  async getLowStock(@CurrentUser() user: AuthUser, @Query('branchId') branchId?: string) {
    return this.inventory.getLowStock(user.businessId!, branchId);
  }

  @Post('adjustments')
  @RequirePermissions('inventory.adjust')
  async createAdjustment(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = StockAdjustmentSchema.parse(body);
    return this.inventory.createAdjustment(user.businessId!, user.id, input);
  }

  @Post('batches/:batchId/write-off')
  @RequirePermissions('inventory.adjust')
  async writeOffBatch(
    @Param('batchId') batchId: string,
    @Body() body: { branchId: string; reason: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventory.writeOffBatch(user.businessId!, user.id, batchId, body.branchId, body.reason);
  }
}
