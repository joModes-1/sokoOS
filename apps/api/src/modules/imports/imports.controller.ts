import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ImportsService } from './imports.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('imports') @ApiBearerAuth() @Controller('imports')
export class ImportsController {
  constructor(private imports: ImportsService) {}
  @Get() async list(@CurrentUser() u: AuthUser) { return this.imports.list(u.businessId!); }
  @Get(':id') async getJob(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.imports.getJob(u.businessId!, id); }
}
