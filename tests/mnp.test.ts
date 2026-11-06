import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';
import { notFoundHandler, errorHandlerMiddleware } from '../src/middleware';
import { mnpRepository } from '../src/modules/mnp/mnp.repository';
import { cacheService } from '../src/database/redis';

describe('Phase 7: Mobile Number Portability (MNP) Engine Tests', () => {
  let app: Express;
  const validPortMsisdn = '2348039988776';

  beforeAll(() => {
    app = createApp();
    app.use(notFoundHandler);
    app.use(errorHandlerMiddleware);
  });

  beforeEach(() => {
    cacheService.clearMemory();
    mnpRepository.clearMemory();
  });

  it('should validate porting eligibility for active donor network number', async () => {
    const res = await request(app)
      .post('/api/v1/mnp/validate')
      .send({
        msisdn: validPortMsisdn,
        donorOperator: 'MTN',
        accountType: 'PREPAID'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.eligible).toBe(true);
    expect(res.body.data.donorOperator).toBe('MTN');
    expect(Array.isArray(res.body.data.requirements)).toBe(true);
  });

  it('should reject porting eligibility if number is barred on donor network', async () => {
    const res = await request(app)
      .post('/api/v1/mnp/validate')
      .send({
        msisdn: '2348000000000',
        donorOperator: 'AIRTEL'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.eligible).toBe(false);
    expect(res.body.data.rejectionReason).toContain('barred');
  });

  it('should reject MNP request without delivery address for physical SIM', async () => {
    const res = await request(app)
      .post('/api/v1/mnp/request')
      .send({
        msisdn: validPortMsisdn,
        donorOperator: 'MTN',
        simType: 'PHYSICAL',
        nin: '22345678901'
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should successfully submit MNP port-in request with eSIM and NIN', async () => {
    const res = await request(app)
      .post('/api/v1/mnp/request')
      .send({
        msisdn: validPortMsisdn,
        donorOperator: 'MTN',
        simType: 'ESIM',
        nin: '22345678901'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('SUBMITTED');
    expect(res.body.data.kycReference).toBeDefined();
  });

  it('should track live porting status and clearinghouse instructions', async () => {
    const submitRes = await request(app)
      .post('/api/v1/mnp/request')
      .send({
        msisdn: validPortMsisdn,
        donorOperator: 'GLO',
        simType: 'ESIM',
        nin: '22345678901'
      });

    const requestId = submitRes.body.data.id;

    const statusRes = await request(app).get(`/api/v1/mnp/status/${requestId}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe('SUBMITTED');
    expect(statusRes.body.data.nextStep).toContain('clearinghouse');
  });

  it('should successfully cancel pending MNP request', async () => {
    const submitRes = await request(app)
      .post('/api/v1/mnp/request')
      .send({
        msisdn: validPortMsisdn,
        donorOperator: '9MOBILE',
        simType: 'ESIM',
        nin: '22345678901'
      });

    const requestId = submitRes.body.data.id;

    const cancelRes = await request(app)
      .post(`/api/v1/mnp/${requestId}/cancel`)
      .send({ reason: 'Changed mind, staying with current operator' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    const checkRes = await request(app).get(`/api/v1/mnp/status/${requestId}`);
    expect(checkRes.body.data.status).toBe('CANCELLED');
  });
});

