import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller.js';
import { TransfersService } from './transfers.service.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [InventoryModule, AuditModule],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}
