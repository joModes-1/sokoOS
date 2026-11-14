import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { DebtsController } from './debts.controller.js';
import { DebtsService } from './debts.service.js';

@Module({
  imports: [AuditModule],
  controllers: [DebtsController],
  providers: [DebtsService],
  exports: [DebtsService],
})
export class DebtsModule {}