import { Module } from '@nestjs/common';
import { PurchasingController } from './purchasing.controller.js';
import { PurchasingService } from './purchasing.service.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [InventoryModule, AuditModule],
  controllers: [PurchasingController],
  providers: [PurchasingService],
  exports: [PurchasingService],
})
export class PurchasingModule {}
