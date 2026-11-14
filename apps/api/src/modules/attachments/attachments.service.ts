import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}
  async list(businessId: string, entityType: string, entityId: string) {
    return this.prisma.attachment.findMany({ where: { businessId, entityType, entityId, deletedAt: null } });
  }
}
