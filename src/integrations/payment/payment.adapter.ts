import { BaseAdapter } from '../base.adapter';
import { PaymentAdapter, InitiatePaymentParams, PaymentInitiationResult, PaymentVerificationResult, RefundResult } from './payment.interface';
import { v4 as uuidv4 } from 'uuid';

export class MockPaymentAdapter extends BaseAdapter implements PaymentAdapter {
  private transactions = new Map<string, {
    transactionId: string;
    gatewayReference: string;
    amount: number;
    currency: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    paidAt?: string;
  }>();

  constructor() {
    super('PaymentGateway', 5000);
  }

  async initiatePayment(params: InitiatePaymentParams): Promise<PaymentInitiationResult> {
    return this.executeWithRetry('initiatePayment', async () => {
      const gatewayReference = `PAY-GW-${uuidv4().substring(0, 8).toUpperCase()}`;
      
      const record = {
        transactionId: params.transactionId,
        gatewayReference,
        amount: params.amount,
        currency: params.currency,
        status: 'PENDING' as const
      };

      this.transactions.set(gatewayReference, record);
      this.transactions.set(params.transactionId, record);

      return {
        transactionId: params.transactionId,
        gatewayReference,
        checkoutUrl: `https://checkout.telewyz-pay.com/pay/${gatewayReference}`,
        status: 'PENDING',
        amount: params.amount,
        currency: params.currency
      };
    }, false);
  }

  async verifyPayment(gatewayReference: string): Promise<PaymentVerificationResult> {
    return this.executeWithRetry('verifyPayment', async () => {
      // Look up transaction
      const record = this.transactions.get(gatewayReference);

      // Handle specific test scenarios
      if (gatewayReference.includes('FAIL')) {
        return {
          gatewayReference,
          transactionId: record?.transactionId || 'tx-failed',
          status: 'FAILED',
          amount: record?.amount || 1000,
          currency: record?.currency || 'NGN',
          failureReason: 'Insufficient funds on customer card'
        };
      }

      if (gatewayReference.includes('PENDING')) {
        return {
          gatewayReference,
          transactionId: record?.transactionId || 'tx-pending',
          status: 'PENDING',
          amount: record?.amount || 1000,
          currency: record?.currency || 'NGN'
        };
      }

      // Default to SUCCESS
      const paidAt = new Date().toISOString();
      if (record) {
        record.status = 'SUCCESS';
        record.paidAt = paidAt;
      }

      return {
        gatewayReference,
        transactionId: record?.transactionId || `tx-${gatewayReference}`,
        status: 'SUCCESS',
        amount: record?.amount || 2500,
        currency: record?.currency || 'NGN',
        paidAt
      };
    }, true);
  }

  async processRefund(gatewayReference: string, amount: number, reason: string): Promise<RefundResult> {
    return this.executeWithRetry('processRefund', async () => {
      const refundId = `REF-${uuidv4().substring(0, 8).toUpperCase()}`;
      return {
        refundId,
        transactionId: gatewayReference,
        amount,
        status: 'PROCESSED'
      };
    }, false);
  }

  clearMemory(): void {
    this.transactions.clear();
  }
}

export const paymentAdapter: PaymentAdapter = new MockPaymentAdapter();

