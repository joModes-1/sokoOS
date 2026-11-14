import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PurchasingService } from './purchasing.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { SupplierSchema, PurchaseOrderCreateSchema, GoodsReceiptCreateSchema } from '@sokoos/shared';

@ApiTags('purchasing')
@ApiBearerAuth()
@Controller('purchasing')
export class PurchasingController {
  constructor(private purchasing: PurchasingService) {}

  @Get('suppliers') async listSuppliers(@CurrentUser() u: AuthUser, @Query('q') q?: string) { return this.purchasing.listSuppliers(u.businessId!, q); }
  @Post('suppliers') @RequirePermissions('po.create') async createSupplier(@Body() body: unknown, @CurrentUser() u: AuthUser) { return this.purchasing.createSupplier(u.businessId!, SupplierSchema.parse(body)); }

  @Get('purchase-orders')
  async listPOs(@CurrentUser() u: AuthUser, @Query() q: Record<string, string>) {
    return this.purchasing.listPurchaseOrders(u.businessId!, { supplierId: q['supplierId'], branchId: q['branchId'], status: q['status'], page: parseInt(q['page'] ?? '1'), limit: parseInt(q['limit'] ?? '25') });
  }

  @Post('purchase-orders') @RequirePermissions('po.create')
  async createPO(@Body() body: unknown, @CurrentUser() u: AuthUser) { return this.purchasing.createPurchaseOrder(u.businessId!, u.id, PurchaseOrderCreateSchema.parse(body)); }

  @Get('purchase-orders/:id')
  async getPO(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.purchasing.getPurchaseOrder(u.businessId!, id); }

  @Patch('purchase-orders/:id/submit') @RequirePermissions('po.submit') async submitPO(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.purchasing.transitionPo(u.businessId!, u.id, id, 'submit'); }
  @Patch('purchase-orders/:id/confirm') @RequirePermissions('po.confirm') async confirmPO(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.purchasing.transitionPo(u.businessId!, u.id, id, 'confirm'); }
  @Patch('purchase-orders/:id/cancel') @RequirePermissions('po.submit') async cancelPO(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.purchasing.transitionPo(u.businessId!, u.id, id, 'cancel'); }
  @Patch('purchase-orders/:id/close') @RequirePermissions('po.confirm') async closePO(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.purchasing.transitionPo(u.businessId!, u.id, id, 'close'); }

  @Post('goods-receipts') @RequirePermissions('po.receive')
  async createGR(@Body() body: unknown, @CurrentUser() u: AuthUser) { return this.purchasing.createGoodsReceipt(u.businessId!, u.id, GoodsReceiptCreateSchema.parse(body)); }
}
