import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService) {}
  async list(businessId: string) { return this.prisma.importJob.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' }, take: 25 }); }
  async getJob(businessId: string, jobId: string) {
    const job = await this.prisma.importJob.findFirst({ where: { id: jobId, businessId }, include: { rows: { where: { status: 'INVALID' }, take: 100 } } });
    return job;
  }
}
