import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module.js';
import { MailerModule } from './common/mailer/mailer.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BusinessesModule } from './modules/businesses/businesses.module.js';
import { BranchesModule } from './modules/branches/branches.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { CatalogueModule } from './modules/catalogue/catalogue.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { TransfersModule } from './modules/transfers/transfers.module.js';
import { PurchasingModule } from './modules/purchasing/purchasing.module.js';
import { SalesModule } from './modules/sales/sales.module.js';
import { DebtsModule } from './modules/debts/debts.module.js';
import { SupplierDebtsModule } from './modules/supplier-debts/supplier-debts.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { ImportsModule } from './modules/imports/imports.module.js';
import { AttachmentsModule } from './modules/attachments/attachments.module.js';
import { DevModule } from './modules/dev/dev.module.js';
import { HealthModule } from './health/health.module.js';
import { JwtAuthGuard } from './common/guards/auth.guard.js';
import { TenantGuard } from './common/guards/tenant.guard.js';
import { PermissionGuard } from './common/guards/permission.guard.js';
import envSchema from './config/env.schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    ThrottlerModule.forRoot([{
      ttl: 60_000,
      limit: 100,
    }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailerModule,
    AuthModule,
    BusinessesModule,
    BranchesModule,
    RbacModule,
    CatalogueModule,
    InventoryModule,
    TransfersModule,
    PurchasingModule,
    SalesModule,
    DebtsModule,
    SupplierDebtsModule,
    PaymentsModule,
    NotificationsModule,
    AuditModule,
    ReportsModule,
    JobsModule,
    ImportsModule,
    AttachmentsModule,
    // Development-only helper behind the "Load demo data" button; endpoints 404 in production.
    DevModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
