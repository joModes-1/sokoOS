import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PaymentSchema, DayClosureSchema } from '@sokoos/shared';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post() @RequirePermissions('sales.create')
  async initiate(@Body() body: unknown, @CurrentUser() u: AuthUser) { return this.payments.initiatePayment(u.businessId!, PaymentSchema.parse(body)); }

  @Get(':id') @RequirePermissions('finance.view')
  async status(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.payments.getStatus(u.businessId!, id); }

  @Get() @RequirePermissions('finance.view')
  async list(@CurrentUser() u: AuthUser, @Query() q: Record<string, string>) { return this.payments.listPayments(u.businessId!, { saleId: q['saleId'], method: q['method'], status: q['status'], page: parseInt(q['page'] ?? '1'), limit: parseInt(q['limit'] ?? '25') }); }

  @Post('day-closure') @RequirePermissions('finance.close')
  async closeDaySession(@Body() body: unknown, @CurrentUser() u: AuthUser) {
    const input = DayClosureSchema.parse(body);
    return this.payments.closeDaySession(u.businessId!, u.id, input.branchId, input.businessDate, input.countedCashMinor, input.denominations, input.discrepancyReason);
  }
}
