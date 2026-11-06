import { notificationRepository } from './notification.repository';
import { notificationQueue } from './notification.queue';

export class NotificationService {
  async sendOtpNotification(recipient: string, otpCode: string, purpose: string) {
    const body = `Your TeleWyz verification code is ${otpCode}. Valid for 5 minutes. Do not share this code. (${purpose})`;
    const record = await notificationRepository.create({
      recipient,
      channel: 'SMS',
      template: 'OTP_NOTIFICATION',
      body,
      status: 'PENDING'
    });

    await notificationQueue.enqueue({
      notificationId: record.id,
      recipient,
      channel: 'SMS',
      body
    });

    return record;
  }

  async sendPaymentConfirmation(recipient: string, transactionId: string, amount: number, type: string) {
    const body = `Payment confirmed! ₦${amount.toLocaleString()} received for ${type}. Transaction Ref: ${transactionId}. Thank you for choosing TeleWyz.`;
    const record = await notificationRepository.create({
      recipient,
      channel: 'SMS',
      template: 'PAYMENT_CONFIRMATION',
      body,
      status: 'PENDING'
    });

    await notificationQueue.enqueue({
      notificationId: record.id,
      recipient,
      channel: 'SMS',
      body
    });

    return record;
  }

  async sendOrderConfirmation(recipient: string, orderNumber: string, type: string, details?: string) {
    const body = `Your order ${orderNumber} (${type}) has been placed successfully. ${details || ''}`;
    const record = await notificationRepository.create({
      recipient,
      channel: 'SMS',
      template: 'ORDER_CONFIRMATION',
      body,
      status: 'PENDING'
    });

    await notificationQueue.enqueue({
      notificationId: record.id,
      recipient,
      channel: 'SMS',
      body
    });

    return record;
  }

  async sendSimActivationNotification(recipient: string, orderNumber: string, msisdn: string, simType: string) {
    const body = `Congratulations! Your TeleWyz ${simType} for ${msisdn} is now fully active. Order: ${orderNumber}. Enjoy seamless 5G connectivity!`;
    const record = await notificationRepository.create({
      recipient,
      channel: 'SMS',
      template: 'SIM_ACTIVATION',
      body,
      status: 'PENDING'
    });

    await notificationQueue.enqueue({
      notificationId: record.id,
      recipient,
      channel: 'SMS',
      body
    });

    return record;
  }

  async sendFailedTransactionNotification(recipient: string, transactionId: string, reason: string) {
    const body = `Transaction Alert: Payment ${transactionId} could not be completed. Reason: ${reason}. Please try again or contact support.`;
    const record = await notificationRepository.create({
      recipient,
      channel: 'SMS',
      template: 'FAILED_TRANSACTION',
      body,
      status: 'PENDING'
    });

    await notificationQueue.enqueue({
      notificationId: record.id,
      recipient,
      channel: 'SMS',
      body
    });

    return record;
  }

  async sendOrderStatusUpdate(recipient: string, orderNumber: string, newStatus: string, reason?: string) {
    const body = `Order Update: ${orderNumber} is now ${newStatus}. ${reason ? 'Note: ' + reason : ''}`;
    const record = await notificationRepository.create({
      recipient,
      channel: 'SMS',
      template: 'ORDER_STATUS_UPDATE',
      body,
      status: 'PENDING'
    });

    await notificationQueue.enqueue({
      notificationId: record.id,
      recipient,
      channel: 'SMS',
      body
    });

    return record;
  }

  async getNotificationHistory(recipient: string) {
    return notificationRepository.findByRecipient(recipient);
  }
}

export const notificationService = new NotificationService();

