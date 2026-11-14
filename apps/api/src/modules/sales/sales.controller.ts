import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CommitSaleSchema } from '@sokoos/shared';

@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private sales: SalesService) {}

  @Post()
  @RequirePermissions('sales.create')
  async commit(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = CommitSaleSchema.parse(body);
    return this.sales.commitSale(user.businessId!, user.id, input);
  }

  @Get()
  @RequirePermissions('sales.view')
  async list(@CurrentUser() user: AuthUser, @Query() q: Record<string, string>) {
    return this.sales.list(user.businessId!, {
      branchId: q['branchId'],
      cashierId: q['cashierId'],
      page: parseInt(q['page'] ?? '1'),
      limit: parseInt(q['limit'] ?? '25'),
      q: q['q'],
      dateFrom: q['dateFrom'],
      dateTo: q['dateTo'],
    });
  }

  @Get(':id/receipt')
  @RequirePermissions('sales.view')
  async receipt(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sales.getReceipt(user.businessId!, id);
  }

  @Get(':id')
  @RequirePermissions('sales.view')
  async getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.sales.getOne(user.businessId!, id);
  }

  @Post(':id/refunds')
  @RequirePermissions('sales.refund')
  async refund(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.sales.createRefund(user.businessId!, user.id, id, body as never);
  }
}
