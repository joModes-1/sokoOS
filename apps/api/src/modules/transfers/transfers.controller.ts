import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TransfersService } from './transfers.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { StockTransferCreateSchema } from '@sokoos/shared';

@ApiTags('transfers')
@ApiBearerAuth()
@Controller('transfers')
export class TransfersController {
  constructor(private transfers: TransfersService) {}

  @Get()
  @RequirePermissions('transfer.request')
  async list(@CurrentUser() u: AuthUser, @Query() q: Record<string, string>) {
    return this.transfers.list(u.businessId!, { branchId: q['branchId'], status: q['status'], page: parseInt(q['page'] ?? '1'), limit: parseInt(q['limit'] ?? '25') });
  }

  @Post()
  @RequirePermissions('transfer.request')
  async create(@Body() body: unknown, @CurrentUser() u: AuthUser) {
    const input = StockTransferCreateSchema.parse(body);
    return this.transfers.create(u.businessId!, u.id, input);
  }

  @Get(':id') @RequirePermissions('transfer.request')
  async getOne(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.transfers.getOne(u.businessId!, id); }

  @Patch(':id/approve') @RequirePermissions('transfer.approve')
  async approve(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.transfers.approve(u.businessId!, u.id, id); }

  @Patch(':id/reject') @RequirePermissions('transfer.approve')
  async reject(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() u: AuthUser) { return this.transfers.reject(u.businessId!, u.id, id, body.reason); }

  @Patch(':id/dispatch') @RequirePermissions('transfer.dispatch')
  async dispatch(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.transfers.dispatch(u.businessId!, u.id, id); }

  @Patch(':id/receive') @RequirePermissions('transfer.receive')
  async receive(@Param('id') id: string, @Body() body: { items: Array<{ transferItemId: string; receivedQuantity: number; shortfallNote?: string }> }, @CurrentUser() u: AuthUser) {
    return this.transfers.receive(u.businessId!, u.id, id, body.items);
  }

  @Patch(':id/close') @RequirePermissions('transfer.approve')
  async close(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.transfers.close(u.businessId!, u.id, id); }
}
