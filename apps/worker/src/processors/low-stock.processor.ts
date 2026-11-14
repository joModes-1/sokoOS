import { Job } from 'bullmq';

export interface LowStockJobData {
  businessId: string;
  branchId?: string;
}

/**
 * Scans inventory_balances and fires low-stock notifications.
 * Runs periodically (cron) or triggered after each sale.
 */
export async function lowStockProcessor(job: Job<LowStockJobData>) {
  const { businessId, branchId } = job.data;
  console.log(`[low-stock] Evaluating stock for business ${businessId}${branchId ? ` branch ${branchId}` : ''}`);

  // TODO:
  // 1. Query inventory_balances where qty <= reorderQty
  // 2. For each low-stock item, check if notification was already sent recently
  // 3. Queue notification jobs for BUSINESS_ADMIN and INVENTORY_CLERK roles
  // 4. Record last notification time to avoid spam

  return { businessId, evaluated: true };
}
