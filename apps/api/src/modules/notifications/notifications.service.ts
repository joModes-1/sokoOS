import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, businessId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, businessId, ...(unreadOnly && { status: 'UNREAD' }) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.update({ where: { id: notificationId }, data: { status: 'READ', readAt: new Date() } });
  }

  async markAllRead(userId: string, businessId: string) {
    return this.prisma.notification.updateMany({ where: { userId, businessId, status: 'UNREAD' }, data: { status: 'READ', readAt: new Date() } });
  }

  async unreadCount(userId: string, businessId: string) {
    return this.prisma.notification.count({ where: { userId, businessId, status: 'UNREAD' } });
  }
}
