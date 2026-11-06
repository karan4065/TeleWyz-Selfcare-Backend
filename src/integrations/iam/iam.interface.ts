export interface IamUserClaims {
  uid: string;
  msisdn?: string;
  email?: string;
  name?: string;
  role?: 'SUBSCRIBER' | 'AGENT' | 'ADMIN';
}

export interface IamAdapter {
  verifyIdToken(token: string): Promise<IamUserClaims>;
  generateOtp(msisdn: string, purpose: string): Promise<{ code: string; expiresAt: Date; cooldownUntil: Date }>;
  validateMsisdnEligibility(msisdn: string): Promise<{ eligible: boolean; accountType: 'PREPAID' | 'POSTPAID'; status: string }>;
}

