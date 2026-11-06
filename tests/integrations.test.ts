import {
  bssAdapter,
  paymentAdapter,
  kycAdapter,
  smsAdapter,
  smtpAdapter,
  pushAdapter,
  logisticsAdapter,
  dmpAdapter,
  cvmAdapter,
  communityAdapter,
  dwhAdapter
} from '../src/integrations';

describe('Phase 3: External Integration Adapters Suite', () => {
  describe('BSS / Optiva EPC Adapter', () => {
    it('should retrieve prepaid balance for standard subscriber', async () => {
      const balance = await bssAdapter.getBalances('2348012345678');
      expect(balance.accountType).toBe('PREPAID');
      expect(balance.prepaidBalance).toBeDefined();
      expect(balance.prepaidBalance?.amount).toBeGreaterThan(0);
      expect(balance.prepaidBalance?.currency).toBe('NGN');
    });

    it('should retrieve postpaid unbilled amount for postpaid subscriber', async () => {
      const balance = await bssAdapter.getBalances('2348099999999');
      expect(balance.accountType).toBe('POSTPAID');
      expect(balance.postpaidBilling).toBeDefined();
      expect(balance.postpaidBilling?.unbilledAmount).toBe(14250.0);
    });

    it('should fetch telecom usage meters for data, voice, and SMS', async () => {
      const usage = await bssAdapter.getUsage('2348012345678');
      expect(usage.data.remainingBytes).toBeGreaterThan(0);
      expect(usage.data.formattedRemaining).toBe('12.0 GB');
      expect(usage.voice.formattedRemaining).toBe('180 Mins');
      expect(usage.sms.formattedRemaining).toBe('78 SMS');
    });

    it('should provision a new physical SIM / eSIM on network HLR', async () => {
      const result = await bssAdapter.provisionSim('2348012345678', '8923401234567890123', 'ESIM');
      expect(result.status).toBe('PROVISIONED');
      expect(result.networkReference).toContain('BSS-HLR-');
    });

    it('should top up prepaid balance and credit BSS wallet', async () => {
      const result = await bssAdapter.topupPrepaidBalance('2348012345678', 1000, 'PAY-REF-1');
      expect(result.newBalance).toBeGreaterThan(1000);
      expect(result.transactionReference).toBeDefined();
    });
  });

  describe('Payment Gateway Adapter', () => {
    it('should initiate payment and return checkout URL', async () => {
      const res = await paymentAdapter.initiatePayment({
        transactionId: 'tx-1001',
        amount: 5000,
        currency: 'NGN',
        msisdn: '2348012345678',
        paymentMethod: 'CARD',
        description: 'Postpaid Bill Settlement'
      });

      expect(res.status).toBe('PENDING');
      expect(res.gatewayReference).toBeDefined();
      expect(res.checkoutUrl).toContain(res.gatewayReference);
    });

    it('should verify payment status directly with payment gateway', async () => {
      const init = await paymentAdapter.initiatePayment({
        transactionId: 'tx-1002',
        amount: 2500,
        currency: 'NGN',
        msisdn: '2348012345678',
        paymentMethod: 'CARD',
        description: 'Airtime Recharge'
      });

      const verification = await paymentAdapter.verifyPayment(init.gatewayReference);
      expect(verification.status).toBe('SUCCESS');
      expect(verification.amount).toBe(2500);
      expect(verification.paidAt).toBeDefined();
    });

    it('should report failure when gateway detects declined payment', async () => {
      const verification = await paymentAdapter.verifyPayment('PAY-GW-FAIL-CARD');
      expect(verification.status).toBe('FAILED');
      expect(verification.failureReason).toBeDefined();
    });

    it('should process refund for failed provisioning or cancellation', async () => {
      const refund = await paymentAdapter.processRefund('PAY-GW-123456', 2000, 'Customer order cancellation');
      expect(refund.status).toBe('PROCESSED');
      expect(refund.refundId).toContain('REF-');
    });
  });

  describe('NIMC / NCC Biometric KYC Adapter', () => {
    it('should verify valid 11-digit National Identity Number', async () => {
      const result = await kycAdapter.verifyNin({
        nin: '22345678901',
        msisdn: '2348012345678',
        firstName: 'Chidi',
        lastName: 'Okonkwo'
      });

      expect(result.verified).toBe(true);
      expect(result.matchScore).toBeGreaterThanOrEqual(90);
      expect(result.kycReference).toContain('NIMC-VER-');
    });

    it('should reject invalid or mismatched NIN', async () => {
      const result = await kycAdapter.verifyNin({
        nin: '11145678901',
        msisdn: '2348012345678',
        firstName: 'Fraud',
        lastName: 'Test'
      });

      expect(result.verified).toBe(false);
      expect(result.rejectionReason).toBeDefined();
    });

    it('should verify biometric liveness', async () => {
      const result = await kycAdapter.verifyBiometrics('22345678901');
      expect(result.matched).toBe(true);
      expect(result.livenessPassed).toBe(true);
    });
  });

  describe('SMS, Email and Push Adapters', () => {
    it('should send SMS and record in delivery log', async () => {
      const res = await smsAdapter.sendSms({
        to: '2348012345678',
        message: 'Your TeleWyz verification code is 123456'
      });

      expect(res.status).toBe('SENT');
      expect(res.messageId).toBeDefined();
      expect(smsAdapter.getSentMessages().length).toBeGreaterThan(0);
    });

    it('should send email notification', async () => {
      const res = await smtpAdapter.sendEmail({
        to: 'subscriber@telewyz.com',
        subject: 'Monthly E-Bill Statement',
        html: '<p>Your bill is ready</p>'
      });

      expect(res.status).toBe('SENT');
      expect(smtpAdapter.getSentEmails().length).toBeGreaterThan(0);
    });

    it('should dispatch push notification via Firebase FCM', async () => {
      const res = await pushAdapter.sendPush({
        deviceToken: 'fcm-device-token-12345',
        title: 'Data Usage Alert',
        body: 'You have used 80% of your data bundle.'
      });

      expect(res.success).toBe(true);
      expect(res.messageId).toContain('FCM-');
    });
  });

  describe('Logistics, Dealer, CVM and Support Adapters', () => {
    it('should dispatch physical SIM order and provide tracking', async () => {
      const dispatch = await logisticsAdapter.createDispatch({
        orderNumber: 'ORD-SIM-9090',
        recipientName: 'Amina Bello',
        recipientPhone: '2348012345678',
        deliveryAddress: '15 Marina, Lagos Island',
        itemType: 'PHYSICAL_SIM'
      });

      expect(dispatch.trackingNumber).toBeDefined();
      expect(dispatch.status).toBe('DISPATCHED');

      const tracking = await logisticsAdapter.getTrackingStatus(dispatch.trackingNumber);
      expect(tracking.timeline.length).toBeGreaterThan(0);
    });

    it('should list dealer stores and filter by city', async () => {
      const allStores = await dmpAdapter.getStores();
      expect(allStores.length).toBeGreaterThanOrEqual(3);

      const lagosStores = await dmpAdapter.getStores('Lagos');
      expect(lagosStores.every(s => s.city === 'Lagos')).toBe(true);
    });

    it('should fetch personalized CVM promotional offers', async () => {
      const offers = await cvmAdapter.getPersonalizedOffers('2348012345678');
      expect(offers.length).toBeGreaterThan(0);
      expect(offers[0].title).toBeDefined();
      expect(offers[0].price).toBeGreaterThan(0);
    });

    it('should create and retrieve customer support ticket', async () => {
      const ticket = await communityAdapter.createTicket({
        msisdn: '2348012345678',
        category: 'BILLING',
        subject: 'Discrepancy in monthly charge',
        description: 'Postpaid invoice shows extra international roaming charges'
      });

      expect(ticket.ticketNumber).toBeDefined();
      expect(ticket.status).toBe('OPEN');

      const retrieved = await communityAdapter.getTicket(ticket.ticketNumber);
      expect(retrieved.ticketNumber).toBe(ticket.ticketNumber);
      expect(retrieved.updates.length).toBeGreaterThan(0);
    });

    it('should publish events to Data Warehouse stream', async () => {
      const published = await dwhAdapter.publishEvent({
        eventName: 'SIM_ACTIVATED',
        entityId: 'sub-1',
        entityType: 'SUBSCRIBER',
        timestamp: new Date().toISOString(),
        payload: { msisdn: '2348012345678', plan: 'PREPAID_STANDARD' }
      });

      expect(published).toBe(true);
      expect(dwhAdapter.getPublishedEvents().length).toBe(1);
    });
  });
});

