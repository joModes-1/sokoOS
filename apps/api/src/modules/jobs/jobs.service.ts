import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}
  async getJob(businessId: string, jobId: string) { return this.prisma.job.findFirst({ where: { id: jobId, businessId } }); }
  async list(businessId: string) { return this.prisma.job.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' }, take: 50 }); }
}
