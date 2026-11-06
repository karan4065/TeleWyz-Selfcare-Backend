import { IamAdapter, IamUserClaims } from './iam.interface';
import { UnauthorizedError } from '../../core/errors';
import { config } from '../../config';

export class MockIamAdapter implements IamAdapter {
  async verifyIdToken(token: string): Promise<IamUserClaims> {
    if (!token || token.trim() === '') {
      throw new UnauthorizedError('Invalid or empty token');
    }

    if (token.startsWith('firebase-valid-')) {
      const uid = token.replace('firebase-valid-', '');
      return {
        uid,
        email: `${uid}@telewyz-test.com`,
        msisdn: '2348012345678',
        name: 'Test Firebase User',
        role: uid.includes('admin') ? 'ADMIN' : 'SUBSCRIBER'
      };
    }

    if (token === 'firebase-invalid-token') {
      throw new UnauthorizedError('Firebase ID token is invalid or has expired');
    }

    // Default mock response for generic test tokens
    return {
      uid: 'mock-user-12345',
      msisdn: '2348012345678',
      email: 'user@telewyz.com',
      name: 'John Doe',
      role: 'SUBSCRIBER'
    };
  }

  async generateOtp(msisdn: string, purpose: string): Promise<{ code: string; expiresAt: Date; cooldownUntil: Date }> {
    const code = '123456'; // Deterministic test OTP for mock environments
    const now = Date.now();
    const expiresAt = new Date(now + config.OTP_EXPIRY_MINUTES * 60 * 1000);
    const cooldownUntil = new Date(now + config.OTP_RESEND_COOLDOWN_SECONDS * 1000);

    return {
      code,
      expiresAt,
      cooldownUntil
    };
  }

  async validateMsisdnEligibility(msisdn: string): Promise<{ eligible: boolean; accountType: 'PREPAID' | 'POSTPAID'; status: string }> {
    // 2348000000000 = barred account test
    if (msisdn === '2348000000000') {
      return { eligible: false, accountType: 'PREPAID', status: 'BARRED' };
    }
    // 2348099999999 = postpaid test
    if (msisdn === '2348099999999') {
      return { eligible: true, accountType: 'POSTPAID', status: 'ACTIVE' };
    }
    return { eligible: true, accountType: 'PREPAID', status: 'ACTIVE' };
  }
}

