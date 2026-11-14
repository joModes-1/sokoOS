import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RbacService } from './rbac.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('rbac') @ApiBearerAuth() @Controller('rbac')
export class RbacController {
  constructor(private rbac: RbacService) {}
  @Get('roles') async roles(@CurrentUser() u: AuthUser) { return this.rbac.listRoles(u.businessId!); }
  @Get('permissions') async permissions() { return this.rbac.listPermissions(); }
  @Get('users') async users(@CurrentUser() u: AuthUser) { return this.rbac.listUsers(u.businessId!); }
  @Post('invitations') async invite(@Body() body: unknown, @CurrentUser() u: AuthUser) { return this.rbac.inviteUser(u.businessId!, u.id, body as never); }
}
