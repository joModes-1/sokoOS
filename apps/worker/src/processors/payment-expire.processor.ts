import { Job } from 'bullmq';

export interface PaymentExpireJobData {
  paymentId: string;
  businessId: string;
  saleId: string;
  expiresAt: string;
}

/**
 * Marks pending mobile money payments as EXPIRED after their TTL.
 * Triggered when a MOMO/Airtel payment is initiated.
 */
export async function paymentExpireProcessor(job: Job<PaymentExpireJobData>) {
  const { paymentId, saleId } = job.data;
  console.log(`[payment-expire] Expiring payment ${paymentId} for sale ${saleId}`);

  // TODO:
  // 1. Load payment from Prisma
  // 2. If status is still PENDING, mark as EXPIRED
  // 3. If sale has no other successful payments, mark sale as FAILED
  // 4. Dispatch notification to cashier

  return { paymentId, expired: true };
}

export interface PaymentReconcileJobData {
  paymentId: string;
  businessId: string;
  mobileMoneyRef: string;
  provider: 'MTN_MOMO' | 'AIRTEL_MONEY';
}

/**
 * Polls mobile money API to reconcile pending payment status.
 */
export async function paymentReconcileProcessor(job: Job<PaymentReconcileJobData>) {
  const { paymentId, provider, mobileMoneyRef } = job.data;
  console.log(`[payment-reconcile] Polling ${provider} for payment ${paymentId} (ref: ${mobileMoneyRef})`);

  // TODO:
  // 1. Call MTN MoMo / Airtel Money API to check status
  // 2. If SUCCEEDED, update payment + sale + notify
  // 3. If FAILED, update payment + restore stock (if already allocated)
  // 4. If still PENDING, re-queue with delay

  return { paymentId, status: 'PENDING' };
}
