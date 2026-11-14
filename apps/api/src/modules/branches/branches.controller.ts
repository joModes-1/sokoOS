import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('branches') @ApiBearerAuth() @Controller('branches')
export class BranchesController {
  constructor(private branches: BranchesService) {}
  @Get() async list(@CurrentUser() u: AuthUser) { return this.branches.list(u.businessId!); }
  @Post() async create(@Body() body: unknown, @CurrentUser() u: AuthUser) { return this.branches.create(u.businessId!, body as never); }
  @Patch(':id') async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() u: AuthUser) { return this.branches.update(u.businessId!, id, body as never); }
  @Get(':id/users') async users(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.branches.getUsers(u.businessId!, id); }
  @Post(':id/users') async assignUser(@Param('id') id: string, @Body() body: { userId: string }, @CurrentUser() u: AuthUser) { return this.branches.assignUser(u.businessId!, id, body.userId, u.id); }
}
