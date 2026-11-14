import './config/env.js';

/**
 * SokoOS BullMQ Worker
 * Processes background jobs: notifications, exports, payment expiry, low-stock checks
 */
import { Worker, Queue, QueueEvents, type Processor } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

connection.on('connect', () => console.log('[worker] Redis connected'));
connection.on('error', (err) => console.error('[worker] Redis error:', err));

// ── Queue definitions ─────────────────────────────────────────────────────────
export const QUEUES = {
  NOTIFICATION: 'notification.dispatch',
  EXPORT: 'export.generate',
  PAYMENT_EXPIRE: 'payment.expire',
  PAYMENT_RECONCILE: 'payment.reconcile',
  IMPORT: 'import.process',
  LOW_STOCK: 'lowstock.evaluate',
  STOCK_RECONCILE: 'stock.reconcile',
} as const;

// ── Import processors ─────────────────────────────────────────────────────────
import { notificationProcessor } from './processors/notification.processor';
import { exportProcessor } from './processors/export.processor';
import { paymentExpireProcessor } from './processors/payment-expire.processor';
import { lowStockProcessor } from './processors/low-stock.processor';

// ── Workers ───────────────────────────────────────────────────────────────────
const workers: Worker[] = [];

function startWorker(queueName: string, processor: Processor, concurrency = 5) {
  const worker = new Worker(queueName, processor, {
    connection,
    concurrency,
  });

  worker.on('completed', (job) => {
    console.log(`[${queueName}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[${queueName}] Job ${job?.id} failed:`, err.message);
  });

  workers.push(worker);
  console.log(`[worker] Started worker for queue: ${queueName}`);
  return worker;
}

startWorker(QUEUES.NOTIFICATION, notificationProcessor, 10);
startWorker(QUEUES.EXPORT, exportProcessor, 2);
startWorker(QUEUES.PAYMENT_EXPIRE, paymentExpireProcessor, 5);
startWorker(QUEUES.LOW_STOCK, lowStockProcessor, 3);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown() {
  console.log('[worker] Shutting down…');
  await Promise.all(workers.map(w => w.close()));
  await connection.quit();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('[worker] SokoOS background worker started');
