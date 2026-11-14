import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('notifications') @ApiBearerAuth() @Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}
  @Get() async list(@CurrentUser() u: AuthUser, @Query('unreadOnly') unreadOnly?: string) { return this.notifications.list(u.id, u.businessId!, unreadOnly === 'true'); }
  @Get('unread-count') async count(@CurrentUser() u: AuthUser) { return { count: await this.notifications.unreadCount(u.id, u.businessId!) }; }
  @Patch(':id/read') async markRead(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.notifications.markRead(u.id, id); }
  @Patch('read-all') async markAllRead(@CurrentUser() u: AuthUser) { return this.notifications.markAllRead(u.id, u.businessId!); }
}
