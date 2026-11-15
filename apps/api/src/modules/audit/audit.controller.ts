import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
@RequirePermissions('reports.view')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  async search(@CurrentUser() user: AuthUser, @Query() q: Record<string, string>) {
    return this.audit.search(user.businessId!, {
      actorUserId: q['actorUserId'],
      action: q['action'],
      targetType: q['targetType'],
      targetId: q['targetId'],
      dateFrom: q['dateFrom'],
      dateTo: q['dateTo'],
      page: parseInt(q['page'] ?? '1'),
      limit: parseInt(q['limit'] ?? '25'),
    });
  }
}
