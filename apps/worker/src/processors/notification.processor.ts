import { Job } from 'bullmq';

import { sendEmail, isEmailConfigured } from '../services/mailer.js';

export interface NotificationJobData {
  userId: string;
  businessId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  channels: ('email' | 'push' | 'sms')[];
  email?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Dispatches notifications to users via email/push/SMS.
 * In production, integrates with SendGrid, Firebase FCM, and Africa's Talking.
 */
export async function notificationProcessor(job: Job<NotificationJobData>) {
  const { userId, type, title, body, channels } = job.data;
  console.log(`[notification] Dispatching ${type} to user ${userId}: "${title}"`);

  for (const channel of channels) {
    switch (channel) {
      case 'email': {
        const recipient = job.data.email;
        if (!recipient) {
          console.warn(`[notification] Email skipped for ${userId}: no recipient address`);
          break;
        }
        if (!isEmailConfigured()) {
          console.warn(`[notification] Email skipped for ${userId}: SMTP not configured`);
          break;
        }
        const result = await sendEmail({
          to: recipient,
          subject: title,
          text: body + (job.data.link ? `\n\n${job.data.link}` : ''),
        });
        if (result.ok) {
          console.log(`[notification] Email sent → ${recipient}: ${title}`);
        } else {
          console.error(`[notification] Email failed → ${recipient}: ${result.error}`);
        }
        break;
      }
      case 'push':
        // TODO: Send via Firebase FCM
        console.log(`[notification] Push → ${userId}: ${title}`);
        break;
      case 'sms':
        // TODO: Send via Africa's Talking
        console.log(`[notification] SMS → ${userId}: ${body}`);
        break;
    }
  }

  return { dispatched: channels.length };
}
