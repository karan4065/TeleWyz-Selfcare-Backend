import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { notFoundHandler, errorHandlerMiddleware } from '../src/middleware';
import { authRepository } from '../src/modules/auth/auth.repository';
import { cacheService } from '../src/database/redis';
import { config } from '../src/config';

describe('Phase 11: Additional Telecom Modules Tests', () => {
  let app: Express;
  let subscriberToken: string;
  let adminToken: string;
  let subscriberId: string;
  const msisdn = '2348012345678';

  beforeAll(async () => {
    app = createApp();
    app.use(notFoundHandler);
    app.use(errorHandlerMiddleware);

    // Create subscriber with 1000 loyalty points
    const sub = await authRepository.createSubscriber({
      msisdn,
      firstName: 'Babatunde',
      lastName: 'Fashola',
      accountType: 'PREPAID',
      status: 'ACTIVE',
      role: 'SUBSCRIBER',
      loyaltyPoints: 1000
    });
    subscriberId = sub.id;

    subscriberToken = jwt.sign(
      { subscriberId: sub.id, msisdn: sub.msisdn, role: 'SUBSCRIBER' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { subscriberId: 'admin-1', msisdn: '2348099990000', role: 'ADMIN' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    cacheService.clearMemory();
  });

  describe('Stores and Network Coverage Services', () => {
    it('should retrieve dealer store locations and filter by city', async () => {
      const res = await request(app).get('/api/v1/services/stores?city=Abuja');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].city).toBe('Abuja');
    });

    it('should retrieve network coverage availability', async () => {
      const res = await request(app).get('/api/v1/services/coverage?state=Lagos');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].coverage5G).toBe('EXCELLENT');
    });
  });

  describe('Customer Support Ticketing', () => {
    let ticketNum: string;

    it('should submit a customer support / dispute ticket', async () => {
      const res = await request(app)
        .post('/api/v1/services/support/tickets')
        .send({
          category: 'BILLING',
          subject: 'Incorrect Data Deduction',
          description: '5GB was deducted despite night browsing free perk',
          priority: 'HIGH'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ticketNumber).toBeDefined();
      expect(res.body.data.status).toBe('OPEN');
      ticketNum = res.body.data.ticketNumber;
    });

    it('should retrieve ticket status and diagnostic updates', async () => {
      const res = await request(app).get(`/api/v1/services/support/tickets/${ticketNum}`);
      expect(res.status).toBe(200);
      expect(res.body.data.ticketNumber).toBe(ticketNum);
      expect(res.body.data.updates.length).toBeGreaterThan(0);
    });
  });

  describe('Loyalty Points & Rewards Engine', () => {
    it('should retrieve subscriber loyalty points balance and tier', async () => {
      const res = await request(app)
        .get('/api/v1/services/loyalty')
        .set('Authorization', `Bearer ${subscriberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.loyaltyPoints).toBe(1000);
      expect(res.body.data.tier).toBe('SILVER');
      expect(res.body.data.rewardsCatalog.length).toBeGreaterThan(0);
    });

    it('should redeem loyalty points for airtime credit', async () => {
      const res = await request(app)
        .post('/api/v1/services/loyalty/redeem')
        .set('Authorization', `Bearer ${subscriberToken}`)
        .send({
          points: 250,
          rewardType: 'AIRTIME'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.redeemedPoints).toBe(250);
      expect(res.body.data.nairaEquivalentCredited).toBe(500); // 250 * 2 = 500
      expect(res.body.data.remainingPoints).toBe(750);
    });

    it('should reject redemption if points requested exceeds balance', async () => {
      const res = await request(app)
        .post('/api/v1/services/loyalty/redeem')
        .set('Authorization', `Bearer ${subscriberToken}`)
        .send({
          points: 5000,
          rewardType: 'AIRTIME'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Insufficient loyalty points');
    });
  });

  describe('Admin Operational Telemetry & RBAC', () => {
    it('should allow ADMIN role to retrieve operational telemetry', async () => {
      const res = await request(app)
        .get('/api/v1/services/admin/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.systemHealth).toBe('OPERATIONAL');
      expect(res.body.data.externalIntegrations.bss).toBe('CONNECTED');
    });

    it('should deny SUBSCRIBER role from accessing admin metrics', async () => {
      const res = await request(app)
        .get('/api/v1/services/admin/metrics')
        .set('Authorization', `Bearer ${subscriberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });
});

