import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import { notFoundHandler, errorHandlerMiddleware } from '../src/middleware';
import { ordersRepository } from '../src/modules/orders/orders.repository';
import { cacheService } from '../src/database/redis';
import { config } from '../src/config';

describe('Phase 9: Orders & 6-Month Historical Ledger Tests', () => {
  let app: Express;
  let subscriberToken: string;
  let agentToken: string;
  const subscriberId = 'sub-order-test-1';
  const msisdn = '2348012345678';

  beforeAll(() => {
    app = createApp();
    app.use(notFoundHandler);
    app.use(errorHandlerMiddleware);

    // Generate tokens
    subscriberToken = jwt.sign(
      { subscriberId, msisdn, role: 'SUBSCRIBER' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );

    agentToken = jwt.sign(
      { subscriberId: 'agent-1', msisdn: '2348099990000', role: 'AGENT' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    cacheService.clearMemory();
    ordersRepository.clearMemory();
  });

  it('should create an order with initial PENDING status and history timeline', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send({
        msisdn,
        type: 'SIM_PURCHASE',
        totalAmount: 1500,
        metadata: { simType: 'PHYSICAL', deliveryAddress: 'Lagos' }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderNumber).toContain('ORD-TLWZ-');
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.history.length).toBe(1);
    expect(res.body.data.history[0].newStatus).toBe('PENDING');
  });

  it('should retrieve order details with tracking', async () => {
    const createRes = await request(app)
      .post('/api/v1/orders')
      .send({
        msisdn,
        type: 'RECHARGE',
        totalAmount: 2000
      });

    const orderId = createRes.body.data.id;

    const res = await request(app).get(`/api/v1/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(orderId);
    expect(res.body.data.type).toBe('RECHARGE');
  });

  it('should enforce state machine transitions: PENDING -> PROCESSING -> COMPLETED', async () => {
    const createRes = await request(app)
      .post('/api/v1/orders')
      .send({ msisdn, type: 'SIM_PURCHASE', totalAmount: 1000 });

    const orderId = createRes.body.data.id;

    // Transition: PENDING -> PROCESSING (Allowed)
    const procRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'PROCESSING', reason: 'Assigned to warehouse fulfillment' });

    expect(procRes.status).toBe(200);
    expect(procRes.body.data.status).toBe('PROCESSING');

    // Transition: PROCESSING -> COMPLETED (Allowed)
    const compRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'COMPLETED', reason: 'Delivered to customer' });

    expect(compRes.status).toBe(200);
    expect(compRes.body.data.status).toBe('COMPLETED');
    expect(compRes.body.data.history.length).toBe(3);

    // Transition: COMPLETED -> PROCESSING (Forbidden: terminal state)
    const invalidRes = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'PROCESSING' });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.message).toContain('Invalid status transition');
  });

  it('should reject status update attempt by SUBSCRIBER role (RBAC)', async () => {
    const createRes = await request(app)
      .post('/api/v1/orders')
      .send({ msisdn, type: 'SIM_PURCHASE' });

    const orderId = createRes.body.data.id;

    const res = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send({ status: 'PROCESSING' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('should list subscriber orders with pagination', async () => {
    // Create 2 orders for subscriber
    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send({ msisdn, type: 'RECHARGE', totalAmount: 500 });

    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send({ msisdn, type: 'PLAN_SUBSCRIPTION', totalAmount: 3500 });

    const res = await request(app)
      .get('/api/v1/orders?limit=10&page=1')
      .set('Authorization', `Bearer ${subscriberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.orders.length).toBe(2);
    expect(res.body.data.pagination.total).toBe(2);
  });

  it('should retrieve 6-month historical activity ledger', async () => {
    // Create an order
    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${subscriberToken}`)
      .send({ msisdn, type: 'RECHARGE', totalAmount: 1000 });

    const res = await request(app)
      .get('/api/v1/orders/history/six-month')
      .set('Authorization', `Bearer ${subscriberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.windowMonths).toBe(6);
    expect(Array.isArray(res.body.data.activities)).toBe(true);
    expect(res.body.data.activities.length).toBeGreaterThan(0);
  });
});

