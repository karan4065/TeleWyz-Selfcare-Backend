import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app';
import { notFoundHandler, errorHandlerMiddleware } from '../src/middleware';
import { authRepository } from '../src/modules/auth/auth.repository';
import { reservationRepository } from '../src/modules/reservation/reservation.repository';
import { simRepository } from '../src/modules/sim/sim.repository';
import { paymentRepository } from '../src/modules/payment/payment.repository';
import { mnpRepository } from '../src/modules/mnp/mnp.repository';
import { ordersRepository } from '../src/modules/orders/orders.repository';
import { cacheService } from '../src/database/redis';

describe('Phase 12: 10 Critical Telecom Business Workflows (E2E Verification)', () => {
  let app: Express;
  const subscriberMsisdn = '2348012345678';
  const postpaidMsisdn = '2348099999999';
  let token: string;
  let subId: string;

  beforeAll(async () => {
    app = createApp();
    app.use(notFoundHandler);
    app.use(errorHandlerMiddleware);
  });

  beforeEach(() => {
    cacheService.clearMemory();
  });

  // Workflow 1: Subscriber login → OTP → authentication → dashboard
  it('Workflow 1: Subscriber login → OTP → authentication → dashboard', async () => {
    // 1. Send OTP
    const sendRes = await request(app)
      .post('/api/v1/auth/otp/send')
      .send({ msisdn: subscriberMsisdn, purpose: 'LOGIN' });

    expect(sendRes.status).toBe(200);
    expect(sendRes.body.data.cooldownSeconds).toBe(60);

    // 2. Verify OTP
    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({
        msisdn: subscriberMsisdn,
        code: '123456',
        purpose: 'LOGIN'
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.token).toBeDefined();
    token = verifyRes.body.data.token;
    subId = verifyRes.body.data.subscriber.id;

    // 3. Access Aggregated Dashboard
    const dashRes = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.subscriber.msisdn).toBe(subscriberMsisdn);
    expect(dashRes.body.data.billingAndBalance.amount).toBeGreaterThan(0);
    expect(dashRes.body.data.meters.data.remaining).toBe('12.0 GB');
  });

  // Workflow 2: Fetch subscriber profile and usage
  it('Workflow 2: Fetch subscriber profile and usage', async () => {
    const profRes = await request(app)
      .get('/api/v1/subscriber/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(profRes.status).toBe(200);
    expect(profRes.body.data.subscriber.id).toBe(subId);

    const usageRes = await request(app)
      .get('/api/v1/subscriber/usage')
      .set('Authorization', `Bearer ${token}`);

    expect(usageRes.status).toBe(200);
    expect(usageRes.body.data.data.formattedRemaining).toBe('12.0 GB');
    expect(usageRes.body.data.voice.formattedRemaining).toBe('180 Mins');
  });

  // Workflow 3: View eligible plans → subscribe to plan
  it('Workflow 3: View eligible plans → subscribe to plan', async () => {
    const plansRes = await request(app).get('/api/v1/catalogue/plans?type=PREPAID');
    expect(plansRes.status).toBe(200);
    expect(plansRes.body.data.length).toBeGreaterThan(0);

    const subRes = await request(app)
      .post('/api/v1/catalogue/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({
        itemId: 'PLAN-PRE-01',
        itemType: 'PLAN'
      });

    expect(subRes.status).toBe(201);
    expect(subRes.body.data.status).toBe('ACTIVE');
    expect(subRes.body.data.networkTransactionRef).toBeDefined();
  });

  // Workflow 4: Reserve number → create SIM order
  it('Workflow 4: Reserve number → create SIM order', async () => {
    const targetNum = '2348055556792';

    // 1. Reserve number
    const reserveRes = await request(app)
      .post('/api/v1/numbers/reserve')
      .set('Authorization', `Bearer ${token}`)
      .send({ msisdn: targetNum });

    expect(reserveRes.status).toBe(201);
    expect(reserveRes.body.data.status).toBe('RESERVED');

    // 2. Create SIM order for reserved number
    const orderRes = await request(app)
      .post('/api/v1/sim/order')
      .set('Authorization', `Bearer ${token}`)
      .send({
        msisdn: targetNum,
        simType: 'ESIM',
        firstName: 'Chidinma',
        lastName: 'Eze',
        email: 'chidinma@telewyz.com'
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.orderNumber).toBeDefined();
    expect(orderRes.body.data.esimQrPayload).toBeDefined();
  });

  // Workflow 5: SIM order → KYC → activation status
  it('Workflow 5: SIM order → KYC → activation status', async () => {
    const msisdn = '2348055556793';

    // 1. Order SIM
    const orderRes = await request(app)
      .post('/api/v1/sim/order')
      .send({
        msisdn,
        simType: 'ESIM',
        firstName: 'Tariq',
        lastName: 'Sanusi',
        email: 'tariq@telewyz.com'
      });

    const orderNumber = orderRes.body.data.orderNumber;

    // 2. Submit KYC
    const kycRes = await request(app)
      .post('/api/v1/sim/kyc/verify')
      .send({
        orderNumber,
        nin: '22345678901'
      });

    expect(kycRes.status).toBe(200);
    expect(kycRes.body.data.kycStatus).toBe('VERIFIED');

    // 3. Activate SIM
    const actRes = await request(app)
      .post('/api/v1/sim/activate')
      .send({ orderNumber });

    expect(actRes.status).toBe(200);
    expect(actRes.body.data.activationStatus).toBe('ACTIVE');

    // 4. Check Status
    const statusRes = await request(app).get(`/api/v1/sim/activation-status/${msisdn}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.activationStatus).toBe('ACTIVE');
  });

  // Workflow 6: Recharge → payment verification → recharge status
  it('Workflow 6: Recharge → payment verification → recharge status', async () => {
    // 1. Initiate recharge
    const rechRes = await request(app)
      .post('/api/v1/payments/recharge')
      .send({
        msisdn: subscriberMsisdn,
        amount: 1500,
        rechargeType: 'AIRTIME'
      });

    expect(rechRes.status).toBe(201);
    const txId = rechRes.body.data.transactionId;

    // 2. Verify payment directly with payment provider
    const verifyRes = await request(app).get(`/api/v1/payments/verify/${txId}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('SUCCESS');

    // 3. Query payment history
    const histRes = await request(app).get(`/api/v1/payments/history?msisdn=${subscriberMsisdn}`);
    expect(histRes.status).toBe(200);
    expect(histRes.body.data.some((t: any) => t.transactionId === txId)).toBe(true);
  });

  // Workflow 7: Postpaid bill → payment → confirmation
  it('Workflow 7: Postpaid bill → payment → confirmation', async () => {
    // 1. Fetch current bill
    const billRes = await request(app).get(`/api/v1/payments/bills/current?msisdn=${postpaidMsisdn}`);
    expect(billRes.status).toBe(200);
    expect(billRes.body.data.unbilledAmount).toBe(14250);

    // 2. Initiate bill settlement
    const payRes = await request(app)
      .post('/api/v1/payments/bills/pay')
      .send({
        msisdn: postpaidMsisdn,
        amount: 14250
      });

    expect(payRes.status).toBe(201);
    const txId = payRes.body.data.transactionId;

    // 3. Verify bill settlement with provider
    const verifyRes = await request(app).get(`/api/v1/payments/verify/${txId}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('SUCCESS');
  });

  // Workflow 8: MNP request → eligibility → porting status
  it('Workflow 8: MNP request → eligibility → porting status', async () => {
    const portNumber = '2348028889999';

    // 1. Check eligibility
    const eligRes = await request(app)
      .post('/api/v1/mnp/validate')
      .send({ msisdn: portNumber, donorOperator: 'AIRTEL' });

    expect(eligRes.status).toBe(200);
    expect(eligRes.body.data.eligible).toBe(true);

    // 2. Submit MNP Request
    const submitRes = await request(app)
      .post('/api/v1/mnp/request')
      .send({
        msisdn: portNumber,
        donorOperator: 'AIRTEL',
        simType: 'ESIM',
        nin: '22345678901'
      });

    expect(submitRes.status).toBe(201);
    const requestId = submitRes.body.data.id;

    // 3. Track Status
    const trackRes = await request(app).get(`/api/v1/mnp/status/${requestId}`);
    expect(trackRes.status).toBe(200);
    expect(trackRes.body.data.status).toBe('SUBMITTED');
  });

  // Workflow 9: Associated account linking → OTP → permission validation
  it('Workflow 9: Associated account linking → OTP → permission validation', async () => {
    const secondaryMsisdn = '2348077778888';

    // 1. Initiate link (dispatches OTP)
    const linkRes = await request(app)
      .post('/api/v1/subscriber/associated-accounts/link')
      .set('Authorization', `Bearer ${token}`)
      .send({
        secondaryMsisdn,
        relationship: 'FAMILY'
      });

    expect(linkRes.status).toBe(201);
    expect(linkRes.body.data.status).toBe('PENDING_OTP_VERIFICATION');

    // 2. Verify link with OTP
    const confirmRes = await request(app)
      .post('/api/v1/subscriber/associated-accounts/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        secondaryMsisdn,
        otpCode: '123456'
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('VERIFIED');

    // 3. Validate permission access
    const usageRes = await request(app)
      .get(`/api/v1/subscriber/usage?msisdn=${secondaryMsisdn}`)
      .set('Authorization', `Bearer ${token}`);

    expect(usageRes.status).toBe(200);
    expect(usageRes.body.data.data.formattedRemaining).toBeDefined();
  });

  // Workflow 10: Order creation → tracking → notification
  it('Workflow 10: Order creation → tracking → notification', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        msisdn: subscriberMsisdn,
        type: 'SIM_PURCHASE',
        totalAmount: 1500,
        metadata: { trackingNumber: 'TLWZ-EXP-TEST1234' }
      });

    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.id;

    // 2. Track order
    const trackRes = await request(app).get(`/api/v1/orders/${orderId}`);
    expect(trackRes.status).toBe(200);
    expect(trackRes.body.data.trackingDetails.status).toBe('IN_TRANSIT');

    // 3. Query 6-month historical activity ledger
    const historyRes = await request(app)
      .get('/api/v1/orders/history/six-month')
      .set('Authorization', `Bearer ${token}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.activities.length).toBeGreaterThan(0);
  });
});

