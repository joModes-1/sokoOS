import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('attachments') @ApiBearerAuth() @Controller('attachments')
export class AttachmentsController {
  constructor(private attachments: AttachmentsService) {}
  @Get() async list(@CurrentUser() u: AuthUser, @Query('entityType') et: string, @Query('entityId') eid: string) { return this.attachments.list(u.businessId!, et, eid); }
}
