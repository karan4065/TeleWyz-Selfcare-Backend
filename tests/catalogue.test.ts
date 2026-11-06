import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';
import { notFoundHandler, errorHandlerMiddleware } from '../src/middleware';
import { cacheService } from '../src/database/redis';

describe('Phase 5: Product Catalogue, Plans and Subscriptions Tests', () => {
  let app: Express;
  let authToken: string;
  let subscriberId: string;
  const testMsisdn = '2348012345678';

  beforeAll(async () => {
    app = createApp();
    app.use(notFoundHandler);
    app.use(errorHandlerMiddleware);

    // Bootstrap user and session
    await request(app).post('/api/v1/auth/otp/send').send({ msisdn: testMsisdn, purpose: 'LOGIN' });
    const loginRes = await request(app).post('/api/v1/auth/otp/verify').send({
      msisdn: testMsisdn,
      code: '123456',
      purpose: 'LOGIN'
    });

    authToken = loginRes.body.data.token;
    subscriberId = loginRes.body.data.subscriber.id;
  });

  beforeEach(() => {
    cacheService.clearMemory();
  });

  describe('Catalogue Browsing (Public)', () => {
    it('should list all available active plans', async () => {
      const res = await request(app).get('/api/v1/catalogue/plans');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    });

    it('should filter plans by PREPAID type', async () => {
      const res = await request(app).get('/api/v1/catalogue/plans?type=PREPAID');
      expect(res.status).toBe(200);
      expect(res.body.data.every((p: any) => p.type === 'PREPAID')).toBe(true);
    });

    it('should filter plans by POSTPAID type', async () => {
      const res = await request(app).get('/api/v1/catalogue/plans?type=POSTPAID');
      expect(res.status).toBe(200);
      expect(res.body.data.every((p: any) => p.type === 'POSTPAID')).toBe(true);
    });

    it('should retrieve detailed specs for a specific plan', async () => {
      const res = await request(app).get('/api/v1/catalogue/plans/PLAN-PRE-01');
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Smart Daily 500MB');
      expect(res.body.data.price).toBe(200);
    });

    it('should return 404 for non-existent plan identifier', async () => {
      const res = await request(app).get('/api/v1/catalogue/plans/NON-EXISTENT-PLAN');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should list add-on booster packages and roaming bundles', async () => {
      const res = await request(app).get('/api/v1/catalogue/packages');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.some((b: any) => b.category === 'ROAMING')).toBe(true);
    });
  });

  describe('Personalized Offers & Subscriptions (Authenticated)', () => {
    let createdSubscriptionId: string;

    it('should retrieve personalized CVM offers for subscriber', async () => {
      const res = await request(app)
        .get('/api/v1/catalogue/offers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should successfully subscribe to an eligible prepaid plan', async () => {
      const res = await request(app)
        .post('/api/v1/catalogue/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: 'PLAN-PRE-01', // Smart Daily ₦200
          itemType: 'PLAN',
          autoRenew: false
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.networkTransactionRef).toBeDefined();
      createdSubscriptionId = res.body.data.subscriptionId;
    });

    it('should reject subscription when prepaid user tries to subscribe to postpaid plan', async () => {
      const res = await request(app)
        .post('/api/v1/catalogue/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: 'PLAN-POST-01', // Postpaid Essential ₦12,000
          itemType: 'PLAN'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Prepaid subscribers cannot subscribe to postpaid contract plans');
    });

    it('should reject subscription when prepaid balance is insufficient', async () => {
      // Create a high-priced mock bundle (e.g. Roaming ₦15,000 while balance is ~₦2,850)
      const res = await request(app)
        .post('/api/v1/catalogue/subscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          itemId: 'BND-ROAM-01', // ₦15,000
          itemType: 'ADDON'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Insufficient prepaid airtime balance');
    });

    it('should list subscriber subscription history', async () => {
      const res = await request(app)
        .get('/api/v1/catalogue/subscriptions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(createdSubscriptionId);
    });

    it('should successfully unsubscribe from active subscription', async () => {
      const res = await request(app)
        .post('/api/v1/catalogue/unsubscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subscriptionId: createdSubscriptionId
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
    });

    it('should reject unsubscription when already cancelled', async () => {
      const res = await request(app)
        .post('/api/v1/catalogue/unsubscribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subscriptionId: createdSubscriptionId
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already CANCELLED');
    });
  });
});

