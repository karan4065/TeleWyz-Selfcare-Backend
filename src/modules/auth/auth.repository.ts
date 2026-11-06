import { v4 as uuidv4 } from 'uuid';
import { prisma, checkDatabaseHealth } from '../../database/prisma';

export interface SubscriberRecord {
  id: string;
  msisdn: string;
  imsi?: string | null;
  email?: string | null;
  firstName: string;
  lastName: string;
  accountType: 'PREPAID' | 'POSTPAID';
  status: 'ACTIVE' | 'SUSPENDED' | 'BARRED' | 'PENDING_KYC' | 'DEACTIVATED';
  role: 'SUBSCRIBER' | 'AGENT' | 'ADMIN';
  loyaltyPoints: number;
  firebaseUid?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  subscriberId: string;
  token: string;
  refreshToken: string;
  deviceId?: string | null;
  deviceType?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

export interface OtpRecord {
  id: string;
  msisdn: string;
  codeHash: string;
  purpose: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  cooldownUntil: Date;
  verified: boolean;
  createdAt: Date;
}

export class AuthRepository {
  // In-memory backing stores for testing and offline resilience
  private subscribers = new Map<string, SubscriberRecord>();
  private sessions = new Map<string, SessionRecord>();
  private otps = new Map<string, OtpRecord>();

  private isDbAvailable: boolean | null = null;

  private async checkDb(): Promise<boolean> {
    if (this.isDbAvailable === null) {
      this.isDbAvailable = await checkDatabaseHealth();
    }
    return this.isDbAvailable;
  }

  // --- Subscriber Operations ---
  async findSubscriberByMsisdn(msisdn: string): Promise<SubscriberRecord | null> {
    if (await this.checkDb()) {
      try {
        const sub = await prisma.subscriber.findUnique({ where: { msisdn } });
        if (sub) return sub as SubscriberRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }
    for (const sub of this.subscribers.values()) {
      if (sub.msisdn === msisdn) return sub;
    }
    return null;
  }

  async findSubscriberById(id: string): Promise<SubscriberRecord | null> {
    if (await this.checkDb()) {
      try {
        const sub = await prisma.subscriber.findUnique({ where: { id } });
        if (sub) return sub as SubscriberRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }
    return this.subscribers.get(id) || null;
  }

  async findSubscriberByFirebaseUid(firebaseUid: string): Promise<SubscriberRecord | null> {
    if (await this.checkDb()) {
      try {
        const sub = await prisma.subscriber.findUnique({ where: { firebaseUid } });
        if (sub) return sub as SubscriberRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }
    for (const sub of this.subscribers.values()) {
      if (sub.firebaseUid === firebaseUid) return sub;
    }
    return null;
  }

  async createSubscriber(data: Omit<SubscriberRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriberRecord> {
    const now = new Date();
    const id = uuidv4();
    const record: SubscriberRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };

    if (await this.checkDb()) {
      try {
        const created = await prisma.subscriber.create({
          data: {
            id: record.id,
            msisdn: record.msisdn,
            imsi: record.imsi,
            email: record.email,
            firstName: record.firstName,
            lastName: record.lastName,
            accountType: record.accountType,
            status: record.status,
            role: record.role,
            loyaltyPoints: record.loyaltyPoints,
            firebaseUid: record.firebaseUid
          }
        });
        this.subscribers.set(record.id, created as SubscriberRecord);
        return created as SubscriberRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.subscribers.set(id, record);
    return record;
  }

  async updateSubscriber(id: string, data: Partial<SubscriberRecord>): Promise<SubscriberRecord> {
    const existing = await this.findSubscriberById(id);
    if (!existing) throw new Error('Subscriber not found');

    const updated: SubscriberRecord = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };

    if (await this.checkDb()) {
      try {
        await prisma.subscriber.update({
          where: { id },
          data: {
            email: updated.email,
            firstName: updated.firstName,
            lastName: updated.lastName,
            accountType: updated.accountType,
            status: updated.status,
            role: updated.role,
            loyaltyPoints: updated.loyaltyPoints,
            firebaseUid: updated.firebaseUid
          }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.subscribers.set(id, updated);
    return updated;
  }

  // --- Session Operations ---
  async createSession(data: Omit<SessionRecord, 'id' | 'createdAt'>): Promise<SessionRecord> {
    const id = uuidv4();
    const record: SessionRecord = {
      ...data,
      id,
      createdAt: new Date()
    };

    if (await this.checkDb()) {
      try {
        const created = await prisma.session.create({
          data: {
            id: record.id,
            subscriberId: record.subscriberId,
            token: record.token,
            refreshToken: record.refreshToken,
            deviceId: record.deviceId,
            deviceType: record.deviceType,
            ipAddress: record.ipAddress,
            userAgent: record.userAgent,
            expiresAt: record.expiresAt,
            revoked: record.revoked
          }
        });
        this.sessions.set(record.id, created as SessionRecord);
        return created as SessionRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.sessions.set(id, record);
    return record;
  }

  async findSessionByToken(token: string): Promise<SessionRecord | null> {
    if (await this.checkDb()) {
      try {
        const s = await prisma.session.findUnique({ where: { token } });
        if (s) return s as SessionRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }
    for (const s of this.sessions.values()) {
      if (s.token === token) return s;
    }
    return null;
  }

  async findSessionByRefreshToken(refreshToken: string): Promise<SessionRecord | null> {
    if (await this.checkDb()) {
      try {
        const s = await prisma.session.findUnique({ where: { refreshToken } });
        if (s) return s as SessionRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }
    for (const s of this.sessions.values()) {
      if (s.refreshToken === refreshToken) return s;
    }
    return null;
  }

  async revokeSession(id: string): Promise<void> {
    const s = this.sessions.get(id);
    if (s) {
      s.revoked = true;
    }
    if (await this.checkDb()) {
      try {
        await prisma.session.update({
          where: { id },
          data: { revoked: true }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }
  }

  async findActiveSessionsBySubscriberId(subscriberId: string): Promise<SessionRecord[]> {
    if (await this.checkDb()) {
      try {
        const sessions = await prisma.session.findMany({
          where: { subscriberId, revoked: false, expiresAt: { gt: new Date() } }
        });
        return sessions as SessionRecord[];
      } catch {
        this.isDbAvailable = false;
      }
    }
    return Array.from(this.sessions.values()).filter(
      s => s.subscriberId === subscriberId && !s.revoked && s.expiresAt > new Date()
    );
  }

  // --- OTP Operations ---
  async createOrUpdateOtp(data: {
    msisdn: string;
    codeHash: string;
    purpose: string;
    expiresAt: Date;
    cooldownUntil: Date;
    maxAttempts?: number;
  }): Promise<OtpRecord> {
    const id = uuidv4();
    const record: OtpRecord = {
      id,
      msisdn: data.msisdn,
      codeHash: data.codeHash,
      purpose: data.purpose,
      attempts: 0,
      maxAttempts: data.maxAttempts || 3,
      expiresAt: data.expiresAt,
      cooldownUntil: data.cooldownUntil,
      verified: false,
      createdAt: new Date()
    };

    if (await this.checkDb()) {
      try {
        const created = await prisma.otpCode.create({
          data: {
            id: record.id,
            msisdn: record.msisdn,
            codeHash: record.codeHash,
            purpose: record.purpose,
            attempts: record.attempts,
            maxAttempts: record.maxAttempts,
            expiresAt: record.expiresAt,
            cooldownUntil: record.cooldownUntil,
            verified: record.verified
          }
        });
        this.otps.set(record.id, created as OtpRecord);
        return created as OtpRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.otps.set(id, record);
    return record;
  }

  async findLatestOtp(msisdn: string, purpose: string): Promise<OtpRecord | null> {
    if (await this.checkDb()) {
      try {
        const latest = await prisma.otpCode.findFirst({
          where: { msisdn, purpose },
          orderBy: { createdAt: 'desc' }
        });
        if (latest) return latest as OtpRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }

    const matches = Array.from(this.otps.values())
      .filter(o => o.msisdn === msisdn && o.purpose === purpose)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return matches[0] || null;
  }

  async incrementOtpAttempts(id: string): Promise<number> {
    const otp = this.otps.get(id);
    if (otp) {
      otp.attempts++;
    }
    if (await this.checkDb()) {
      try {
        const updated = await prisma.otpCode.update({
          where: { id },
          data: { attempts: { increment: 1 } }
        });
        return updated.attempts;
      } catch {
        this.isDbAvailable = false;
      }
    }
    return otp ? otp.attempts : 1;
  }

  async markOtpVerified(id: string): Promise<void> {
    const otp = this.otps.get(id);
    if (otp) {
      otp.verified = true;
    }
    if (await this.checkDb()) {
      try {
        await prisma.otpCode.update({
          where: { id },
          data: { verified: true }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }
  }

  clearMemory(): void {
    this.subscribers.clear();
    this.sessions.clear();
    this.otps.clear();
  }
}

export const authRepository = new AuthRepository();

