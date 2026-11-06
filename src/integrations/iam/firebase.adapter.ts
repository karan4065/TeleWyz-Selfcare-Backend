import admin from 'firebase-admin';
import { IamAdapter, IamUserClaims } from './iam.interface';
import { MockIamAdapter } from './mockIam.adapter';
import { config } from '../../config';
import { logger } from '../../core/logger';
import { UnauthorizedError } from '../../core/errors';

export class FirebaseIamAdapter implements IamAdapter {
  private mockFallback = new MockIamAdapter();
  private firebaseApp: admin.app.App | null = null;

  constructor() {
    if (!config.USE_MOCK_IAM && config.FIREBASE_PROJECT_ID && config.FIREBASE_CLIENT_EMAIL) {
      try {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.FIREBASE_PROJECT_ID,
            clientEmail: config.FIREBASE_CLIENT_EMAIL,
            privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          })
        }, 'telewyz-firebase-app');
        logger.info('Firebase Admin initialized successfully');
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Failed to initialize Firebase Admin SDK. Using Mock IAM adapter.');
        this.firebaseApp = null;
      }
    }
  }

  async verifyIdToken(token: string): Promise<IamUserClaims> {
    if (config.USE_MOCK_IAM || !this.firebaseApp) {
      return this.mockFallback.verifyIdToken(token);
    }

    try {
      const decoded = await this.firebaseApp.auth().verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        role: (decoded.role as any) || 'SUBSCRIBER',
        msisdn: decoded.phone_number ? decoded.phone_number.replace(/^\+/, '') : undefined
      };
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Firebase token verification failed');
      throw new UnauthorizedError('Invalid or expired Firebase ID token');
    }
  }

  async generateOtp(msisdn: string, purpose: string): Promise<{ code: string; expiresAt: Date; cooldownUntil: Date }> {
    return this.mockFallback.generateOtp(msisdn, purpose);
  }

  async validateMsisdnEligibility(msisdn: string): Promise<{ eligible: boolean; accountType: 'PREPAID' | 'POSTPAID'; status: string }> {
    return this.mockFallback.validateMsisdnEligibility(msisdn);
  }
}

export const iamAdapter: IamAdapter = config.USE_MOCK_IAM
  ? new MockIamAdapter()
  : new FirebaseIamAdapter();

