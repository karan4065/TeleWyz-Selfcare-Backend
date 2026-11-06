import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';
import { notFoundHandler, errorHandlerMiddleware } from '../src/middleware';
import { notificationService } from '../src/modules/notifications/notification.service';
import { notificationRepository } from '../src/modules/notifications/notification.repository';
import { notificationQueue } from '../src/modules/notifications/notification.queue';
import { backgroundScheduler } from '../src/jobs/scheduler';
import { reservationRepository } from '../src/modules/reservation/reservation.repository';

describe('Phase 10: Notifications & Background Schedulers Tests', () => {
  let app: Express;
  const recipientMsisdn = '2348012345678';

  beforeAll(() => {
    app = createApp();
    app.use(notFoundHandler);
    app.use(errorHandlerMiddleware);
  });

  beforeEach(() => {
    notificationRepository.clearMemory();
    notificationQueue.clear();
  });

  afterAll(() => {
    backgroundScheduler.stop();
  });

  it('should enqueue and dispatch OTP notification asynchronously', async () => {
    const record = await notificationService.sendOtpNotification(recipientMsisdn, '654321', 'LOGIN');
    expect(record.id).toBeDefined();
    expect(record.recipient).toBe(recipientMsisdn);
    expect(record.template).toBe('OTP_NOTIFICATION');

    // Allow async event loop to process queue
    await new Promise(r => setTimeout(r, 50));

    const history = await notificationService.getNotificationHistory(recipientMsisdn);
    expect(history.length).toBe(1);
    expect(history[0].status).toBe('SENT');
  });

  it('should enqueue payment confirmation notification', async () => {
    await notificationService.sendPaymentConfirmation(recipientMsisdn, 'TX-100', 5000, 'Recharge');
    await new Promise(r => setTimeout(r, 50));

    const history = await notificationService.getNotificationHistory(recipientMsisdn);
    expect(history.length).toBe(1);
    expect(history[0].body).toContain('Payment confirmed');
  });

  it('should enqueue SIM activation notification', async () => {
    await notificationService.sendSimActivationNotification(recipientMsisdn, 'ORD-99', recipientMsisdn, 'ESIM');
    await new Promise(r => setTimeout(r, 50));

    const history = await notificationService.getNotificationHistory(recipientMsisdn);
    expect(history[0].body).toContain('ESIM for 2348012345678 is now fully active');
  });

  it('should enqueue failed transaction notification', async () => {
    await notificationService.sendFailedTransactionNotification(recipientMsisdn, 'TX-FAIL-1', 'Insufficient balance');
    await new Promise(r => setTimeout(r, 50));

    const history = await notificationService.getNotificationHistory(recipientMsisdn);
    expect(history[0].body).toContain('could not be completed');
  });

  it('should enqueue order status update notification', async () => {
    await notificationService.sendOrderStatusUpdate(recipientMsisdn, 'ORD-88', 'DELIVERED', 'Courier confirmed delivery');
    await new Promise(r => setTimeout(r, 50));

    const history = await notificationService.getNotificationHistory(recipientMsisdn);
    expect(history[0].body).toContain('ORD-88 is now DELIVERED');
  });

  it('should retrieve notification history via API', async () => {
    await notificationService.sendOtpNotification(recipientMsisdn, '112233', 'LOGIN');
    await new Promise(r => setTimeout(r, 50));

    const res = await request(app).get(`/api/v1/notifications/history?recipient=${recipientMsisdn}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should release expired reservations in background scheduler', async () => {
    // Reserve a number with negative TTL (already expired)
    const msisdn = '2348055556789';
    await reservationRepository.reserveNumber(msisdn, 'test-user', -1);

    const released = await backgroundScheduler.releaseExpiredReservations();
    expect(released).toBeGreaterThan(0);

    const check = await reservationRepository.findByMsisdn(msisdn);
    expect(check?.status).toBe('AVAILABLE');
  });
});

