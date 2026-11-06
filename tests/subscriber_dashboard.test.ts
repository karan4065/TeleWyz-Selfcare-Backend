import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';
import { notFoundHandler, errorHandlerMiddleware } from '../src/middleware';
import { authRepository } from '../src/modules/auth/auth.repository';
import { subscriberRepository } from '../src/modules/subscriber/subscriber.repository';
import { cacheService } from '../src/database/redis';

describe('Phase 4: Subscriber Management & Aggregated Dashboard Tests', () => {
  let app: Express;
  let authToken: string;
  let subscriberId: string;
  const primaryMsisdn = '2348012345678';
  const secondaryMsisdn = '2348098765432';

  beforeAll(async () => {
    app = createApp();
    app.use(notFoundHandler);
    app.use(errorHandlerMiddleware);

    // Bootstrap user and session
    await request(app).post('/api/v1/auth/otp/send').send({ msisdn: primaryMsisdn, purpose: 'LOGIN' });
    const loginRes = await request(app).post('/api/v1/auth/otp/verify').send({
      msisdn: primaryMsisdn,
      code: '123456',
      purpose: 'LOGIN'
    });

    authToken = loginRes.body.data.token;
    subscriberId = loginRes.body.data.subscriber.id;
  });

  beforeEach(() => {
    cacheService.clearMemory();
  });

  describe('Subscriber Profile APIs', () => {
    it('should retrieve subscriber profile with authoritative BSS balances', async () => {
      const res = await request(app)
        .get('/api/v1/subscriber/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscriber.msisdn).toBe(primaryMsisdn);
      expect(res.body.data.telecomBalance.accountType).toBe('PREPAID');
      expect(res.body.data.telecomBalance.prepaidBalance.amount).toBeGreaterThan(0);
    });

    it('should update subscriber contact details', async () => {
      const res = await request(app)
        .patch('/api/v1/subscriber/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Emeka',
          lastName: 'Nwosu',
          email: 'emeka.nwosu@telewyz.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Emeka');
      expect(res.body.data.lastName).toBe('Nwosu');
      expect(res.body.data.email).toBe('emeka.nwosu@telewyz.com');
    });

    it('should reject profile update with empty body', async () => {
      const res = await request(app)
        .patch('/api/v1/subscriber/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should retrieve authoritative telecom usage meters from BSS', async () => {
      const res = await request(app)
        .get('/api/v1/subscriber/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data.formattedRemaining).toBe('12.0 GB');
      expect(res.body.data.voice.formattedRemaining).toBe('180 Mins');
      expect(res.body.data.sms.formattedRemaining).toBe('78 SMS');
    });
  });

  describe('Associated Accounts & Permission Verification', () => {
    let associationId: string;

    it('should initiate linking a secondary account and send verification OTP', async () => {
      const res = await request(app)
        .post('/api/v1/subscriber/associated-accounts/link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secondaryMsisdn,
          relationship: 'FAMILY',
          permissions: ['VIEW_BALANCE', 'RECHARGE']
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING_OTP_VERIFICATION');
      expect(res.body.data.debugOtp).toBe('123456');
      associationId = res.body.data.associatedAccountId;
    });

    it('should reject linking subscriber own primary MSISDN', async () => {
      const res = await request(app)
        .post('/api/v1/subscriber/associated-accounts/link')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secondaryMsisdn: primaryMsisdn
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot link your own primary MSISDN');
    });

    it('should verify associated account with valid OTP', async () => {
      const res = await request(app)
        .post('/api/v1/subscriber/associated-accounts/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secondaryMsisdn,
          otpCode: '123456'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('VERIFIED');
    });

    it('should list verified associated accounts', async () => {
      const res = await request(app)
        .get('/api/v1/subscriber/associated-accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].secondaryMsisdn).toBe(secondaryMsisdn);
      expect(res.body.data[0].verified).toBe(true);
    });

    it('should allow querying usage for verified associated account', async () => {
      const res = await request(app)
        .get(`/api/v1/subscriber/usage?msisdn=${secondaryMsisdn}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.data.formattedRemaining).toBeDefined();
    });

    it('should deny querying usage for an unassociated MSISDN', async () => {
      const unassociatedNumber = '2348055555555';
      const res = await request(app)
        .get(`/api/v1/subscriber/usage?msisdn=${unassociatedNumber}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should switch active context to verified associated account', async () => {
      const res = await request(app)
        .post('/api/v1/subscriber/switch-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetMsisdn: secondaryMsisdn });

      expect(res.status).toBe(200);
      expect(res.body.data.activeMsisdn).toBe(secondaryMsisdn);
      expect(res.body.data.isPrimary).toBe(false);
      expect(res.body.data.contextToken).toBeDefined();
    });

    it('should delink associated account successfully', async () => {
      const res = await request(app)
        .delete(`/api/v1/subscriber/associated-accounts/${associationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('delinked successfully');
    });
  });

  describe('Aggregated Dashboard API', () => {
    it('should return complete aggregated dashboard snapshot', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.subscriber.msisdn).toBe(primaryMsisdn);
      expect(data.currentPlan).toBeDefined();
      expect(data.billingAndBalance.amount).toBeGreaterThan(0);
      expect(data.meters.data.remaining).toBe('12.0 GB');
      expect(data.meters.voice.remaining).toBe('180 Mins');
      expect(data.meters.sms.remaining).toBe('78 SMS');
      expect(Array.isArray(data.promotions)).toBe(true);
      expect(data.promotions.length).toBeGreaterThan(0);
    });

    it('should require authentication to access dashboard', async () => {
      const res = await request(app).get('/api/v1/dashboard');
      expect(res.status).toBe(401);
    });
  });
});

