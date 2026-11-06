export interface AuthenticatedUser {
  subscriberId: string;
  msisdn: string;
  role: 'SUBSCRIBER' | 'AGENT' | 'ADMIN';
  accountType?: 'PREPAID' | 'POSTPAID';
  email?: string;
  firebaseUid?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      rawBody?: Buffer;
      idempotencyKey?: string;
    }
  }
}
