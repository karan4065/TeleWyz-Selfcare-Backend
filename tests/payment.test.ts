import request from 'supertest';
import { Express } from 'express';
import crypto from 'crypto';
import { createApp } from '../src/app';
import { notFoundHandler, errorHandlerMiddleware } from '../src/middleware';
import { paymentRepository } from '../src/modules/payment/payment.repository';
import { cacheService } from '../src/database/redis';
import { config } from '../src/config';

describe('Phase 8: Recharge, Postpaid Billing, Payments & Webhooks Tests', () => {
  let app: Express;
  const prepaidMsisdn = '2348012345678';
  const postpaidMsisdn = '2348099999999';

  beforeAll(() => {
    app = createApp();
    app.use(notFoundHandler);
    app.use(errorHandlerMiddleware);
  });

  beforeEach(() => {
    cacheService.clearMemory();
    paymentRepository.clearMemory();
  });

  describe('Recharge Catalogue & Postpaid Bill Inquiry', () => {
    it('should return airtime denominations and quick data bundles', async () => {
      const res = await request(app).get('/api/v1/payments/recharge-catalogue');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.airtimeDenominations.length).toBeGreaterThanOrEqual(4);
      expect(res.body.data.quickDataRecharges.length).toBeGreaterThanOrEqual(3);
    });

    it('should fetch live unbilled amount for postpaid subscriber', async () => {
      const res = await request(app).get(`/api/v1/payments/bills/current?msisdn=${postpaidMsisdn}`);
      expect(res.status).toBe(200);
      expect(res.body.data.accountType).toBe('POSTPAID');
      expect(res.body.data.unbilledAmount).toBe(14250.0);
      expect(res.body.data.dueDate).toBeDefined();
    });

    it('should reject bill inquiry for prepaid subscriber', async () => {
      const res = await request(app).get(`/api/v1/payments/bills/current?msisdn=${prepaidMsisdn}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not a postpaid subscriber');
    });
  });

  describe('Recharge & Bill Payment Initiation with Idempotency', () => {
    it('should initiate airtime recharge and return gateway checkout URL', async () => {
      const res = await request(app)
        .post('/api/v1/payments/recharge')
        .send({
          msisdn: prepaidMsisdn,
          amount: 1000,
          rechargeType: 'AIRTIME',
          paymentMethod: 'CARD'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transactionId).toContain('TX-RECH-');
      expect(res.body.data.gatewayReference).toBeDefined();
      expect(res.body.data.checkoutUrl).toBeDefined();
    });

    it('should prevent duplicate recharge when identical Idempotency-Key is provided', async () => {
      const idemKey = `idem-rech-${Date.now()}`;
      const payload = {
        msisdn: prepaidMsisdn,
        amount: 500,
        rechargeType: 'AIRTIME'
      };

      // First call
      const res1 = await request(app)
        .post('/api/v1/payments/recharge')
        .set('Idempotency-Key', idemKey)
        .send(payload);

      expect(res1.status).toBe(201);
      const originalTxId = res1.body.data.transactionId;

      // Immediate re-transmission with same key
      const res2 = await request(app)
        .post('/api/v1/payments/recharge')
        .set('Idempotency-Key', idemKey)
        .send(payload);

      expect(res2.status).toBe(201);
      expect(res2.body.data.transactionId).toBe(originalTxId);
    });

    it('should initiate postpaid bill settlement', async () => {
      const res = await request(app)
        .post('/api/v1/payments/bills/pay')
        .send({
          msisdn: postpaidMsisdn,
          amount: 14250,
          paymentMethod: 'BANK_TRANSFER'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.transactionId).toContain('TX-BILL-');
      expect(res.body.data.amount).toBe(14250);
    });
  });

  describe('Authoritative Payment Verification & Webhook Callbacks', () => {
    it('should verify payment status directly with payment gateway and credit BSS wallet', async () => {
      const init = await request(app)
        .post('/api/v1/payments/recharge')
        .send({
          msisdn: prepaidMsisdn,
          amount: 2000,
          rechargeType: 'AIRTIME'
        });

      const txId = init.body.data.transactionId;

      // Verify payment with gateway
      const verifyRes = await request(app).get(`/api/v1/payments/verify/${txId}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.status).toBe('SUCCESS');
      expect(verifyRes.body.data.paidAt).toBeDefined();

      // Second verification should be idempotent
      const verifyRes2 = await request(app).get(`/api/v1/payments/verify/${txId}`);
      expect(verifyRes2.status).toBe(200);
      expect(verifyRes2.body.data.status).toBe('SUCCESS');
    });

    it('should process webhook callback with valid HMAC signature', async () => {
      const init = await request(app)
        .post('/api/v1/payments/recharge')
        .send({
          msisdn: prepaidMsisdn,
          amount: 1000,
          rechargeType: 'AIRTIME'
        });

      const gwRef = init.body.data.gatewayReference;
      const payload = {
        event: 'charge.success',
        reference: gwRef,
        amount: 1000,
        currency: 'NGN'
      };

      const payloadStr = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', config.PAYMENT_WEBHOOK_SECRET)
        .update(payloadStr)
        .digest('hex');

      const webhookRes = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-signature', signature)
        .send(payload);

      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body.data.status).toBe('SUCCESS');
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = { event: 'charge.success', reference: 'PAY-GW-999' };
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-signature', 'forged-invalid-signature-1234567890abcdef1234567890abcdef')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should retrieve payment transaction history', async () => {
      await request(app)
        .post('/api/v1/payments/recharge')
        .send({
          msisdn: prepaidMsisdn,
          amount: 500,
          rechargeType: 'AIRTIME'
        });

      const res = await request(app).get(`/api/v1/payments/history?msisdn=${prepaidMsisdn}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].msisdn).toBe(prepaidMsisdn);
    });
  });
});

