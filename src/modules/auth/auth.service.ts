import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authRepository, SubscriberRecord, SessionRecord } from './auth.repository';
import { iamAdapter } from '../../integrations/iam/firebase.adapter';
import { config } from '../../config';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../core/errors';
import { SendOtpDto, VerifyOtpDto, FirebaseLoginDto } from './auth.dto';
import { logger } from '../../core/logger';

export class AuthService {
  private hashOtp(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async sendOtp(dto: SendOtpDto): Promise<{
    msisdn: string;
    purpose: string;
    expiresAt: Date;
    cooldownSeconds: number;
    debugOtp?: string;
  }> {
    // 1. Check account eligibility if LOGIN
    if (dto.purpose === 'LOGIN') {
      const eligibility = await iamAdapter.validateMsisdnEligibility(dto.msisdn);
      if (!eligibility.eligible) {
        throw new ForbiddenError(`MSISDN ${dto.msisdn} is not eligible for self-care (${eligibility.status})`);
      }
    }

    // 2. Check for active cooldown
    const latest = await authRepository.findLatestOtp(dto.msisdn, dto.purpose);
    const now = new Date();

    if (latest && latest.cooldownUntil > now && !latest.verified) {
      const remainingSecs = Math.ceil((latest.cooldownUntil.getTime() - now.getTime()) / 1000);
      throw new BadRequestError(`Please wait ${remainingSecs} seconds before requesting another OTP`, {
        cooldownRemainingSeconds: remainingSecs
      });
    }

    // 3. Generate 6-digit OTP
    let code: string;
    if (config.NODE_ENV === 'test' || config.USE_MOCK_IAM) {
      code = '123456';
    } else {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const codeHash = this.hashOtp(code);
    const expiresAt = new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);
    const cooldownUntil = new Date(Date.now() + config.OTP_RESEND_COOLDOWN_SECONDS * 1000);

    // 4. Save hashed OTP
    await authRepository.createOrUpdateOtp({
      msisdn: dto.msisdn,
      codeHash,
      purpose: dto.purpose,
      expiresAt,
      cooldownUntil,
      maxAttempts: config.OTP_MAX_ATTEMPTS
    });

    logger.info({ msisdn: dto.msisdn, purpose: dto.purpose }, 'OTP generated successfully');

    return {
      msisdn: dto.msisdn,
      purpose: dto.purpose,
      expiresAt,
      cooldownSeconds: config.OTP_RESEND_COOLDOWN_SECONDS,
      // Only include debugOtp in development / test environments
      debugOtp: config.NODE_ENV !== 'production' ? code : undefined
    };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    deviceInfo?: { deviceId?: string; deviceType?: string; ipAddress?: string; userAgent?: string }
  ): Promise<{
    token: string;
    refreshToken: string;
    expiresIn: string;
    subscriber: Partial<SubscriberRecord>;
  }> {
    const latest = await authRepository.findLatestOtp(dto.msisdn, dto.purpose);

    if (!latest || latest.verified) {
      throw new BadRequestError('No active OTP found. Please request a new OTP.');
    }

    const now = new Date();
    if (now > latest.expiresAt) {
      throw new BadRequestError('OTP has expired. Please request a new OTP.');
    }

    if (latest.attempts >= latest.maxAttempts) {
      throw new BadRequestError('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    const inputHash = this.hashOtp(dto.code);
    if (inputHash !== latest.codeHash) {
      const attempts = await authRepository.incrementOtpAttempts(latest.id);
      const remaining = Math.max(0, latest.maxAttempts - attempts);
      throw new BadRequestError('Invalid OTP code entered', {
        attemptsUsed: attempts,
        remainingAttempts: remaining
      });
    }

    // Mark verified
    await authRepository.markOtpVerified(latest.id);

    // Find or create subscriber
    let subscriber = await authRepository.findSubscriberByMsisdn(dto.msisdn);
    if (!subscriber) {
      const eligibility = await iamAdapter.validateMsisdnEligibility(dto.msisdn);
      subscriber = await authRepository.createSubscriber({
        msisdn: dto.msisdn,
        firstName: 'Subscriber',
        lastName: dto.msisdn.slice(-4),
        accountType: eligibility.accountType,
        status: 'ACTIVE',
        role: 'SUBSCRIBER',
        loyaltyPoints: 100
      });
    }

    if (subscriber.status === 'BARRED' || subscriber.status === 'DEACTIVATED') {
      throw new ForbiddenError(`Account status is ${subscriber.status}. Access denied.`);
    }

    return this.createSessionAndTokens(subscriber, deviceInfo);
  }

  async loginWithFirebase(
    dto: FirebaseLoginDto,
    deviceInfo?: { deviceId?: string; deviceType?: string; ipAddress?: string; userAgent?: string }
  ): Promise<{
    token: string;
    refreshToken: string;
    expiresIn: string;
    subscriber: Partial<SubscriberRecord>;
  }> {
    const claims = await iamAdapter.verifyIdToken(dto.idToken);

    let subscriber: SubscriberRecord | null = null;

    if (claims.uid) {
      subscriber = await authRepository.findSubscriberByFirebaseUid(claims.uid);
    }

    if (!subscriber && claims.msisdn) {
      subscriber = await authRepository.findSubscriberByMsisdn(claims.msisdn);
      if (subscriber) {
        // Link firebase UID to existing subscriber
        subscriber = await authRepository.updateSubscriber(subscriber.id, { firebaseUid: claims.uid });
      }
    }

    if (!subscriber) {
      const msisdn = claims.msisdn || `23480${Math.floor(10000000 + Math.random() * 90000000)}`;
      subscriber = await authRepository.createSubscriber({
        msisdn,
        email: claims.email,
        firstName: claims.name ? claims.name.split(' ')[0] : 'Subscriber',
        lastName: claims.name && claims.name.split(' ').length > 1 ? claims.name.split(' ').slice(1).join(' ') : 'User',
        accountType: 'PREPAID',
        status: 'ACTIVE',
        role: claims.role || 'SUBSCRIBER',
        loyaltyPoints: 100,
        firebaseUid: claims.uid
      });
    }

    return this.createSessionAndTokens(subscriber, deviceInfo);
  }

  async refreshAccessToken(refreshToken: string): Promise<{ token: string; expiresIn: string }> {
    const session = await authRepository.findSessionByRefreshToken(refreshToken);

    if (!session || session.revoked || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid, expired or revoked refresh token');
    }

    const subscriber = await authRepository.findSubscriberById(session.subscriberId);
    if (!subscriber || subscriber.status === 'BARRED' || subscriber.status === 'DEACTIVATED') {
      throw new ForbiddenError('Account is not eligible for token refresh');
    }

    const token = jwt.sign(
      {
        subscriberId: subscriber.id,
        msisdn: subscriber.msisdn,
        role: subscriber.role,
        accountType: subscriber.accountType,
        email: subscriber.email,
        sessionId: session.id
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );

    return { token, expiresIn: config.JWT_EXPIRES_IN };
  }

  async logout(sessionId: string): Promise<void> {
    await authRepository.revokeSession(sessionId);
  }

  async getActiveSessions(subscriberId: string): Promise<SessionRecord[]> {
    return authRepository.findActiveSessionsBySubscriberId(subscriberId);
  }

  async revokeSession(subscriberId: string, sessionId: string): Promise<void> {
    const sessions = await authRepository.findActiveSessionsBySubscriberId(subscriberId);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new NotFoundError('Session not found or already revoked');
    }
    await authRepository.revokeSession(sessionId);
  }

  private async createSessionAndTokens(
    subscriber: SubscriberRecord,
    deviceInfo?: { deviceId?: string; deviceType?: string; ipAddress?: string; userAgent?: string }
  ): Promise<{
    token: string;
    refreshToken: string;
    expiresIn: string;
    subscriber: Partial<SubscriberRecord>;
  }> {
    const refreshToken = uuidv4() + '-' + uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await authRepository.createSession({
      subscriberId: subscriber.id,
      token: uuidv4(),
      refreshToken,
      deviceId: deviceInfo?.deviceId || 'web-client',
      deviceType: deviceInfo?.deviceType || 'BROWSER',
      ipAddress: deviceInfo?.ipAddress || null,
      userAgent: deviceInfo?.userAgent || null,
      expiresAt,
      revoked: false
    });

    const token = jwt.sign(
      {
        subscriberId: subscriber.id,
        msisdn: subscriber.msisdn,
        role: subscriber.role,
        accountType: subscriber.accountType,
        email: subscriber.email,
        sessionId: session.id
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );

    return {
      token,
      refreshToken,
      expiresIn: config.JWT_EXPIRES_IN,
      subscriber: {
        id: subscriber.id,
        msisdn: subscriber.msisdn,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        accountType: subscriber.accountType,
        role: subscriber.role,
        status: subscriber.status,
        loyaltyPoints: subscriber.loyaltyPoints
      }
    };
  }
}

export const authService = new AuthService();
