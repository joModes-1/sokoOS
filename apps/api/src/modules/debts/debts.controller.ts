import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CreateDebtSchema, RecordDebtPaymentSchema, WriteOffDebtSchema } from '@sokoos/shared';
import { DebtsService } from './debts.service.js';

/**
 * Customer credit — "they took it on debt and pay a little each time".
 *
 * Permissions deliberately reuse `sales.*` rather than introducing `debts.*` codes: those two are
 * already granted to every role that stands at a counter (admin, branch manager, cashier), and a
 * brand-new code would 403 every non-admin until each business's role rows were migrated.
 */
@ApiTags('debts')
@ApiBearerAuth()
@Controller('debts')
export class DebtsController {
  constructor(private debts: DebtsService) {}

  @Get('summary')
  @RequirePermissions('sales.view')
  async summary(@CurrentUser() user: AuthUser) {
    return this.debts.summary(user.businessId!);
  }

  @Get('by-person')
  @RequirePermissions('sales.view')
  async byPerson(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return { data: await this.debts.byPerson(user.businessId!, q) };
  }

  @Get('customers/:customerId')
  @RequirePermissions('sales.view')
  async byCustomer(@Param('customerId') customerId: string, @CurrentUser() user: AuthUser) {
    return this.debts.byCustomer(user.businessId!, customerId);
  }

  @Get()
  @RequirePermissions('sales.view')
  async list(@CurrentUser() user: AuthUser, @Query() q: Record<string, string>) {
    return this.debts.list(user.businessId!, {
      status: q['status'],
      q: q['q'],
      customerId: q['customerId'],
      page: parseInt(q['page'] ?? '1'),
      limit: parseInt(q['limit'] ?? '25'),
    });
  }

  @Post()
  @RequirePermissions('sales.create')
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.debts.create(user.businessId!, user.id, CreateDebtSchema.parse(body));
  }

  @Post(':id/payments')
  @RequirePermissions('sales.create')
  async recordPayment(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.debts.recordPayment(user.businessId!, user.id, id, RecordDebtPaymentSchema.parse(body));
  }

  @Post(':id/write-off')
  @RequirePermissions('sales.create')
  async writeOff(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = WriteOffDebtSchema.parse(body ?? {});
    return this.debts.writeOff(user.businessId!, user.id, id, input.reason);
  }
}