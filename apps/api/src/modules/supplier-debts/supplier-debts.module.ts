import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { SupplierDebtsController } from './supplier-debts.controller.js';
import { SupplierDebtsService } from './supplier-debts.service.js';

@Module({
  imports: [AuditModule],
  controllers: [SupplierDebtsController],
  providers: [SupplierDebtsService],
  exports: [SupplierDebtsService],
})
export class SupplierDebtsModule {}
