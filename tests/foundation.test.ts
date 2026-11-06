import request from 'supertest';
import express, { Express } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import {
  correlationIdMiddleware,
  securityHeadersMiddleware,
  jsonBodyLimitMiddleware,
  maintenanceMiddleware,
  createRateLimiter,
  validate,
  idempotencyMiddleware,
  verifyWebhookSignature,
  rbacMiddleware,
  notFoundHandler,
  errorHandlerMiddleware
} from '../src/middleware';
import { sendSuccess } from '../src/core/response';
import { BadRequestError, ForbiddenError } from '../src/core/errors';
import { createApp } from '../src/app';
import { cacheService } from '../src/database/redis';

describe('Phase 1: Foundation & Middleware Tests', () => {
  beforeEach(() => {
    cacheService.clearMemory();
  });

  describe('Health Check API', () => {
    let app: Express;

    beforeAll(() => {
      app = createApp();
      app.use(notFoundHandler);
      app.use(errorHandlerMiddleware);
    });

    it('should return 200 OK with healthy status payload', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UP');
      expect(res.body.requestId).toBeDefined();
      expect(res.headers['x-correlation-id']).toBeDefined();
    });

    it('should return 404 for non-existent route with standard error format', async () => {
      const res = await request(app).get('/api/v1/non-existent-route');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('NOT_FOUND');
      expect(res.body.requestId).toBeDefined();
    });
  });

  describe('Correlation ID Middleware', () => {
    let app: Express;

    beforeAll(() => {
      app = express();
      app.use(correlationIdMiddleware);
      app.get('/test-corr', (_req, res) => {
        sendSuccess(res, { ok: true });
      });
      app.use(errorHandlerMiddleware);
    });

    it('should generate a correlation ID if none provided in request', async () => {
      const res = await request(app).get('/test-corr');
      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(res.body.requestId).toBe(res.headers['x-correlation-id']);
    });

    it('should preserve and propagate incoming x-correlation-id', async () => {
      const customId = 'telewyz-test-corr-12345';
      const res = await request(app)
        .get('/test-corr')
        .set('x-correlation-id', customId);

      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBe(customId);
      expect(res.body.requestId).toBe(customId);
    });
  });

  describe('Request Validation Middleware (Zod)', () => {
    let app: Express;

    beforeAll(() => {
      app = express();
      app.use(jsonBodyLimitMiddleware);
      const testSchema = {
        body: z.object({
          msisdn: z.string().regex(/^234\d{10}$/, 'Must be valid 13-digit MSISDN (234...)'),
          amount: z.number().positive('Amount must be positive')
        })
      };

      app.post('/validate-test', validate(testSchema), (req, res) => {
        sendSuccess(res, req.body);
      });
      app.use(errorHandlerMiddleware);
    });

    it('should succeed with valid payload', async () => {
      const res = await request(app)
        .post('/validate-test')
        .send({ msisdn: '2348012345678', amount: 500 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(500);
    });

    it('should reject with 400 when validation fails', async () => {
      const res = await request(app)
        .post('/validate-test')
        .send({ msisdn: 'invalid-number', amount: -50 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.details)).toBe(true);
      expect(res.body.details.length).toBeGreaterThan(0);
    });
  });

  describe('Idempotency Middleware', () => {
    let app: Express;
    let callCount = 0;

    beforeAll(() => {
      app = express();
      app.use(jsonBodyLimitMiddleware);
      app.post('/idempotent-action', idempotencyMiddleware(true), (_req, res) => {
        callCount++;
        sendSuccess(res, { processedCount: callCount }, 'Action executed');
      });
      app.use(errorHandlerMiddleware);
    });

    it('should reject requests without Idempotency-Key header when required', async () => {
      const res = await request(app).post('/idempotent-action').send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('should return cached response on replay with identical Idempotency-Key', async () => {
      const key = 'idem-key-' + Date.now();
      callCount = 0;

      // First call
      const res1 = await request(app)
        .post('/idempotent-action')
        .set('Idempotency-Key', key)
        .send({ foo: 'bar' });

      expect(res1.status).toBe(200);
      expect(res1.body.data.processedCount).toBe(1);

      // Second call (replay)
      const res2 = await request(app)
        .post('/idempotent-action')
        .set('Idempotency-Key', key)
        .send({ foo: 'bar' });

      expect(res2.status).toBe(200);
      expect(res2.headers['idempotency-replay']).toBe('true');
      expect(res2.body.data.processedCount).toBe(1); // handler was not executed again!
      expect(callCount).toBe(1);
    });
  });

  describe('Webhook Signature Verification Middleware', () => {
    const secret = 'test-webhook-secret-key-12345';
    let app: Express;

    beforeAll(() => {
      app = express();
      app.use(jsonBodyLimitMiddleware);
      app.post('/webhook', verifyWebhookSignature(secret), (_req, res) => {
        sendSuccess(res, { verified: true });
      });
      app.use(errorHandlerMiddleware);
    });

    it('should allow webhook requests with valid HMAC signature', async () => {
      const payload = { event: 'payment.success', reference: 'ref-100' };
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const res = await request(app)
        .post('/webhook')
        .set('x-signature', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.data.verified).toBe(true);
    });

    it('should reject webhook requests with missing signature header', async () => {
      const res = await request(app)
        .post('/webhook')
        .send({ event: 'payment.success' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should reject webhook requests with tampered signature', async () => {
      const res = await request(app)
        .post('/webhook')
        .set('x-signature', 'invalid-tampered-signature-hex-1234567890abcdef1234567890abcdef')
        .send({ event: 'payment.success' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Rate Limiter Middleware', () => {
    let app: Express;

    beforeAll(() => {
      app = express();
      // Rate limiter allowing 2 requests per 5 seconds
      const testLimiter = createRateLimiter({ windowMs: 5000, max: 2 });
      app.get('/rate-test', testLimiter, (_req, res) => {
        sendSuccess(res, { ok: true });
      });
      app.use(errorHandlerMiddleware);
    });

    it('should throttle requests after exceeding threshold', async () => {
      const res1 = await request(app).get('/rate-test');
      expect(res1.status).toBe(200);

      const res2 = await request(app).get('/rate-test');
      expect(res2.status).toBe(200);

      const res3 = await request(app).get('/rate-test');
      expect(res3.status).toBe(429);
      expect(res3.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res3.headers['retry-after']).toBeDefined();
    });
  });

  describe('RBAC Middleware', () => {
    let app: Express;

    beforeAll(() => {
      app = express();
      app.use((req, _res, next) => {
        // Mock user role from test header
        const role = req.headers['x-test-role'] as any;
        if (role) {
          req.user = {
            subscriberId: 'sub-1',
            msisdn: '2348011111111',
            role
          };
        }
        next();
      });

      app.get('/admin-only', rbacMiddleware(['ADMIN']), (_req, res) => {
        sendSuccess(res, { secret: 'admin-data' });
      });
      app.use(errorHandlerMiddleware);
    });

    it('should allow ADMIN role to access protected route', async () => {
      const res = await request(app)
        .get('/admin-only')
        .set('x-test-role', 'ADMIN');

      expect(res.status).toBe(200);
      expect(res.body.data.secret).toBe('admin-data');
    });

    it('should deny SUBSCRIBER role from accessing admin route', async () => {
      const res = await request(app)
        .get('/admin-only')
        .set('x-test-role', 'SUBSCRIBER');

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });
});
