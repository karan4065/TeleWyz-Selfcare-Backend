export interface InitiatePaymentParams {
  transactionId: string;
  amount: number;
  currency: string;
  msisdn: string;
  paymentMethod: string;
  description: string;
  callbackUrl?: string;
  idempotencyKey?: string;
}

export interface PaymentInitiationResult {
  transactionId: string;
  gatewayReference: string;
  checkoutUrl: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  currency: string;
}

export interface PaymentVerificationResult {
  gatewayReference: string;
  transactionId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  paidAt?: string;
  failureReason?: string;
}

export interface RefundResult {
  refundId: string;
  transactionId: string;
  amount: number;
  status: 'PROCESSED' | 'FAILED';
}

export interface PaymentAdapter {
  initiatePayment(params: InitiatePaymentParams): Promise<PaymentInitiationResult>;
  verifyPayment(gatewayReference: string): Promise<PaymentVerificationResult>;
  processRefund(gatewayReference: string, amount: number, reason: string): Promise<RefundResult>;
}

