import { notificationRepository, NotificationRecordData } from './notification.repository';
import { smsAdapter } from '../../integrations/sms/sms.adapter';
import { smtpAdapter } from '../../integrations/smtp/smtp.adapter';
import { pushAdapter } from '../../integrations/push/push.adapter';
import { logger } from '../../core/logger';

export interface NotificationJob {
  notificationId: string;
  recipient: string;
  channel: 'SMS' | 'EMAIL' | 'PUSH';
  subject?: string;
  body: string;
  attempts: number;
  maxRetries: number;
}

export class NotificationQueue {
  private queue: NotificationJob[] = [];
  private failedJobs: Array<NotificationJob & { error: string }> = [];
  private isProcessing = false;

  async enqueue(job: Omit<NotificationJob, 'attempts' | 'maxRetries'>, maxRetries: number = 3): Promise<void> {
    this.queue.push({
      ...job,
      attempts: 0,
      maxRetries
    });

    // Trigger non-blocking async processor
    setImmediate(() => this.processNext());
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const job = this.queue.shift();
    if (!job) {
      this.isProcessing = false;
      return;
    }

    try {
      job.attempts++;

      if (job.channel === 'SMS') {
        await smsAdapter.sendSms({ to: job.recipient, message: job.body });
      } else if (job.channel === 'EMAIL') {
        await smtpAdapter.sendEmail({
          to: job.recipient,
          subject: job.subject || 'TeleWyz Notification',
          html: `<p>${job.body}</p>`
        });
      } else if (job.channel === 'PUSH') {
        await pushAdapter.sendPush({
          deviceToken: job.recipient,
          title: job.subject || 'TeleWyz Update',
          body: job.body
        });
      }

      // Mark success
      await notificationRepository.updateStatus(job.notificationId, 'SENT');
      logger.info({ notificationId: job.notificationId, channel: job.channel }, 'Notification dispatched successfully');
    } catch (err: any) {
      logger.warn(
        { notificationId: job.notificationId, attempts: job.attempts, maxRetries: job.maxRetries, error: err.message },
        'Notification job failed'
      );

      if (job.attempts < job.maxRetries) {
        // Re-queue with exponential backoff delay
        setTimeout(() => {
          this.queue.push(job);
          this.processNext();
        }, Math.pow(2, job.attempts) * 200);
      } else {
        // Exceeded retries - mark failed and record in failed-jobs tracker
        await notificationRepository.updateStatus(job.notificationId, 'FAILED', err.message);
        this.failedJobs.push({ ...job, error: err.message });
        logger.error({ notificationId: job.notificationId, error: err.message }, 'Notification permanently failed');
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  getFailedJobs(): Array<NotificationJob & { error: string }> {
    return [...this.failedJobs];
  }

  clear(): void {
    this.queue = [];
    this.failedJobs = [];
    this.isProcessing = false;
  }
}

export const notificationQueue = new NotificationQueue();

