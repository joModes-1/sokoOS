import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('jobs') @ApiBearerAuth() @Controller('jobs')
export class JobsController {
  constructor(private jobs: JobsService) {}
  @Get() async list(@CurrentUser() u: AuthUser) { return this.jobs.list(u.businessId!); }
  @Get(':id') async get(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.jobs.getJob(u.businessId!, id); }
}
