import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CreateSupplierDebtSchema, RecordDebtPaymentSchema, WriteOffDebtSchema } from '@sokoos/shared';
import { SupplierDebtsService } from './supplier-debts.service.js';

/**
 * Supplier credit — what the shop owes its wholesalers for goods taken on credit.
 *
 * Permissions deliberately reuse existing codes rather than introducing `supplier_debts.*` ones
 * (a brand-new code would 403 every non-admin until each business's role rows were migrated):
 * reading what the business owes is `finance.view`; settling a supplier debt is `po.create`, the
 * same code that already lets someone place orders with that supplier.
 */
@ApiTags('supplier-debts')
@ApiBearerAuth()
@Controller('supplier-debts')
export class SupplierDebtsController {
  constructor(private supplierDebts: SupplierDebtsService) {}

  @Get()
  @RequirePermissions('finance.view')
  async list(@CurrentUser() user: AuthUser, @Query() q: Record<string, string>) {
    return this.supplierDebts.list(user.businessId!, {
      status: q['status'],
      q: q['q'],
      supplierId: q['supplierId'],
      page: parseInt(q['page'] ?? '1'),
      limit: parseInt(q['limit'] ?? '25'),
    });
  }

  @Post()
  @RequirePermissions('po.create')
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.supplierDebts.create(user.businessId!, user.id, CreateSupplierDebtSchema.parse(body));
  }

  @Post(':id/payments')
  @RequirePermissions('po.create')
  async recordPayment(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.supplierDebts.recordPayment(user.businessId!, user.id, id, RecordDebtPaymentSchema.parse(body));
  }

  @Post(':id/write-off')
  @RequirePermissions('po.create')
  async writeOff(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = WriteOffDebtSchema.parse(body ?? {});
    return this.supplierDebts.writeOff(user.businessId!, user.id, id, input.reason);
  }
}
