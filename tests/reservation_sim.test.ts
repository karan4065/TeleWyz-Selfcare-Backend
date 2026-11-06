import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';
import { notFoundHandler, errorHandlerMiddleware } from '../src/middleware';
import { reservationRepository } from '../src/modules/reservation/reservation.repository';
import { simRepository } from '../src/modules/sim/sim.repository';
import { cacheService } from '../src/database/redis';

describe('Phase 6: Number Reservation & SIM Purchase / Activation Tests', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    app = createApp();
    app.use(notFoundHandler);
    app.use(errorHandlerMiddleware);

    reservationRepository.reset();
    simRepository.clearMemory();
    cacheService.clearMemory();

    // Bootstrap user and session
    await request(app).post('/api/v1/auth/otp/send').send({ msisdn: '2348012345678', purpose: 'LOGIN' });
    const loginRes = await request(app).post('/api/v1/auth/otp/verify').send({
      msisdn: '2348012345678',
      code: '123456',
      purpose: 'LOGIN'
    });

    authToken = loginRes.body.data.token;
  });

  beforeEach(() => {
    cacheService.clearMemory();
  });

  describe('Number Reservation APIs', () => {
    const targetMsisdn = '2348011112222'; // PLATINUM number

    it('should search available numbers by category', async () => {
      const res = await request(app).get('/api/v1/numbers/search?category=PLATINUM');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].category).toBe('PLATINUM');
    });

    it('should check number availability', async () => {
      const res = await request(app).get(`/api/v1/numbers/${targetMsisdn}/check`);
      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
      expect(res.body.data.category).toBe('PLATINUM');
    });

    it('should reserve an available number with a hold timer', async () => {
      const res = await request(app)
        .post('/api/v1/numbers/reserve')
        .send({ msisdn: targetMsisdn, ttlMinutes: 15 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RESERVED');
      expect(res.body.data.expiresAt).toBeDefined();
    });

    it('should prevent duplicate reservation of an already reserved number', async () => {
      // First reservation
      await request(app).post('/api/v1/numbers/reserve').send({ msisdn: targetMsisdn });

      // Second attempt by another user
      const res = await request(app).post('/api/v1/numbers/reserve').send({ msisdn: targetMsisdn });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not available for reservation');
    });

    it('should cancel reservation and return number to available pool', async () => {
      const cancelTargetMsisdn = '2348022223333';
      const reserveRes = await request(app)
        .post('/api/v1/numbers/reserve')
        .send({ msisdn: cancelTargetMsisdn });

      expect(reserveRes.status).toBe(201);
      const reservationId = reserveRes.body.data.id;

      const cancelRes = await request(app)
        .post(`/api/v1/numbers/reservations/${reservationId}/cancel`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.success).toBe(true);

      // Verify availability again
      const checkRes = await request(app).get(`/api/v1/numbers/${cancelTargetMsisdn}/check`);
      expect(checkRes.body.data.available).toBe(true);
    });
  });

  describe('SIM Purchase and Activation Workflow', () => {
    const simMsisdn = '2348055556789';
    let physicalOrderNumber: string;
    let esimOrderNumber: string;

    it('should successfully create physical SIM order with courier dispatch tracking', async () => {
      const res = await request(app)
        .post('/api/v1/sim/order')
        .send({
          msisdn: simMsisdn,
          simType: 'PHYSICAL',
          firstName: 'Fatima',
          lastName: 'Dangote',
          email: 'fatima@telewyz.com',
          deliveryAddress: 'Plot 4, Victoria Island, Lagos'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toBeDefined();
      expect(res.body.data.trackingNumber).toBeDefined();
      expect(res.body.data.kycStatus).toBe('NOT_SUBMITTED');
      expect(res.body.data.activationStatus).toBe('PENDING');
      physicalOrderNumber = res.body.data.orderNumber;
    });

    it('should reject physical SIM order without delivery address', async () => {
      const res = await request(app)
        .post('/api/v1/sim/order')
        .send({
          msisdn: '2348055556790',
          simType: 'PHYSICAL',
          firstName: 'Fatima',
          lastName: 'Dangote',
          email: 'fatima@telewyz.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should successfully create eSIM order with digital QR profile', async () => {
      const res = await request(app)
        .post('/api/v1/sim/order')
        .send({
          msisdn: '2348055556791',
          simType: 'ESIM',
          firstName: 'Tunde',
          lastName: 'Bakare',
          email: 'tunde@telewyz.com'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.esimQrPayload).toContain('LPA:1$');
      esimOrderNumber = res.body.data.orderNumber;
    });

    it('should reject activation before KYC verification is completed', async () => {
      const res = await request(app)
        .post('/api/v1/sim/activate')
        .send({ orderNumber: physicalOrderNumber });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot activate SIM. Identity verification required');
    });

    it('should submit and verify NIMC KYC identity', async () => {
      const res = await request(app)
        .post('/api/v1/sim/kyc/verify')
        .send({
          orderNumber: physicalOrderNumber,
          nin: '22345678901' // valid 11-digit NIN
        });

      expect(res.status).toBe(200);
      expect(res.body.data.kycStatus).toBe('VERIFIED');
      expect(res.body.data.kycReference).toBeDefined();
    });

    it('should activate SIM on network after KYC is confirmed by authoritative BSS', async () => {
      const res = await request(app)
        .post('/api/v1/sim/activate')
        .send({ orderNumber: physicalOrderNumber });

      expect(res.status).toBe(200);
      expect(res.body.data.activationStatus).toBe('ACTIVE');
      expect(res.body.data.networkReference).toContain('BSS-HLR-');
    });

    it('should query live activation status of the activated MSISDN', async () => {
      const res = await request(app).get(`/api/v1/sim/activation-status/${simMsisdn}`);
      expect(res.status).toBe(200);
      expect(res.body.data.activationStatus).toBe('ACTIVE');
      expect(res.body.data.kycStatus).toBe('VERIFIED');
    });

    it('should request SIM replacement for authenticated subscriber', async () => {
      const res = await request(app)
        .post('/api/v1/sim/replace')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'UPGRADE_TO_ESIM',
          simType: 'ESIM'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.orderNumber).toContain('REP-SIM-');
      expect(res.body.data.newIccid).toBeDefined();
    });
  });
});
