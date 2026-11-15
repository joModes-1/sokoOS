import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('dashboard') async dashboard(@CurrentUser() u: AuthUser, @Query('branchId') branchId?: string, @Query('days') days?: string) { return this.reports.getDashboard(u.businessId!, branchId, days ? parseInt(days, 10) || 30 : 30); }

  @Get('sales') @RequirePermissions('reports.view')
  async sales(@CurrentUser() u: AuthUser, @Query() q: Record<string, string>) {
    return this.reports.getSalesReport(u.businessId!, {
      branchId: q['branchId'],
      dateFrom: q['dateFrom'] ?? new Date(Date.now() - 30 * 86_400_000).toISOString(),
      dateTo: q['dateTo'] ?? new Date().toISOString(),
      groupBy: (q['groupBy'] as 'day' | 'week' | 'month') ?? 'day',
    });
  }

  @Get('stock') @RequirePermissions('reports.view') async stock(@CurrentUser() u: AuthUser, @Query('branchId') b?: string) { return this.reports.getStockReport(u.businessId!, b); }
  @Get('low-stock') @RequirePermissions('reports.view') async lowStock(@CurrentUser() u: AuthUser, @Query('branchId') b?: string) { return this.reports.getLowStockReport(u.businessId!, b); }
  @Get('purchasing') @RequirePermissions('reports.view') async purchasing(@CurrentUser() u: AuthUser, @Query() q: Record<string, string>) { return this.reports.getPurchasingReport(u.businessId!, { supplierId: q['supplierId'], dateFrom: q['dateFrom'], dateTo: q['dateTo'] }); }

  @Get('activity') @RequirePermissions('reports.view')
  async activity(@CurrentUser() u: AuthUser, @Query() q: Record<string, string>) {
    return this.reports.getActivityReport(u.businessId!, { dateFrom: q['dateFrom'], dateTo: q['dateTo'] });
  }
}
