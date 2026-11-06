import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';
import { notFoundHandler, errorHandlerMiddleware } from '../src/middleware';
import { authRepository } from '../src/modules/auth/auth.repository';
import { cacheService } from '../src/database/redis';

describe('Phase 2: Authentication & Central IAM / Firebase Auth Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
    app.use(notFoundHandler);
    app.use(errorHandlerMiddleware);
  });

  beforeEach(() => {
    authRepository.clearMemory();
    cacheService.clearMemory();
  });

  describe('OTP Generation & Verification Lifecycle', () => {
    const testMsisdn = '2348012345678';

    it('should successfully send OTP to eligible subscriber', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ msisdn: testMsisdn, purpose: 'LOGIN' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.msisdn).toBe(testMsisdn);
      expect(res.body.data.cooldownSeconds).toBe(60);
      expect(res.body.data.debugOtp).toBe('123456');
    });

    it('should reject OTP request for barred MSISDN', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ msisdn: '2348000000000', purpose: 'LOGIN' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should enforce cooldown if OTP requested again immediately', async () => {
      // First request
      await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ msisdn: testMsisdn, purpose: 'LOGIN' });

      // Immediate second request
      const res = await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ msisdn: testMsisdn, purpose: 'LOGIN' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please wait');
      expect(res.body.details?.cooldownRemainingSeconds).toBeGreaterThan(0);
    });

    it('should reject verification with incorrect OTP and track attempts', async () => {
      // Send OTP
      await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ msisdn: testMsisdn, purpose: 'LOGIN' });

      // Verify with wrong code
      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ msisdn: testMsisdn, code: '999999', purpose: 'LOGIN' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid OTP code entered');
      expect(res.body.details.remainingAttempts).toBe(2);
    });

    it('should successfully verify OTP and return access token & session', async () => {
      // Send OTP
      await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ msisdn: testMsisdn, purpose: 'LOGIN' });

      // Verify with correct code
      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({
          msisdn: testMsisdn,
          code: '123456',
          purpose: 'LOGIN',
          deviceId: 'test-device-1',
          deviceType: 'MOBILE_APP'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.subscriber.msisdn).toBe(testMsisdn);
      expect(res.body.data.subscriber.status).toBe('ACTIVE');
    });

    it('should reject replay of already verified OTP', async () => {
      await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ msisdn: testMsisdn, purpose: 'LOGIN' });

      // First verification (succeeds)
      await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ msisdn: testMsisdn, code: '123456', purpose: 'LOGIN' });

      // Second verification (fails)
      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ msisdn: testMsisdn, code: '123456', purpose: 'LOGIN' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('No active OTP found');
    });
  });

  describe('Firebase Authentication Integration', () => {
    it('should authenticate subscriber using valid Firebase ID token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/firebase-login')
        .send({
          idToken: 'firebase-valid-test-uid-firebase-101',
          deviceId: 'pixel-9-pro',
          deviceType: 'ANDROID'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.subscriber.role).toBe('SUBSCRIBER');
    });

    it('should assign ADMIN role if Firebase claims denote admin', async () => {
      const res = await request(app)
        .post('/api/v1/auth/firebase-login')
        .send({
          idToken: 'firebase-valid-admin-user-999',
          deviceId: 'admin-macbook',
          deviceType: 'BROWSER'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.subscriber.role).toBe('ADMIN');
    });

    it('should reject authentication when Firebase token is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/firebase-login')
        .send({
          idToken: 'firebase-invalid-token'
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Session Management & Token Refresh', () => {
    let authToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Log in to get tokens
      await request(app)
        .post('/api/v1/auth/otp/send')
        .send({ msisdn: '2348011223344', purpose: 'LOGIN' });

      const loginRes = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ msisdn: '2348011223344', code: '123456', purpose: 'LOGIN', deviceId: 'dev-1' });

      authToken = loginRes.body.data.token;
      refreshToken = loginRes.body.data.refreshToken;
    });

    it('should refresh access token using valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject refresh when refresh token is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should list active subscriber sessions', async () => {
      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].deviceId).toBe('dev-1');
    });

    it('should successfully revoke an active session', async () => {
      const sessionsRes = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      const sessionId = sessionsRes.body.data[0].id;

      const delRes = await request(app)
        .delete(`/api/v1/auth/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.message).toBe('Session revoked successfully');

      // Refresh with that session's refresh token should now fail
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(401);
    });

    it('should successfully logout and invalidate session', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });
});

