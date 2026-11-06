import { v4 as uuidv4 } from 'uuid';
import { prisma, checkDatabaseHealth } from '../../database/prisma';
import { SubscriberRecord } from '../auth/auth.repository';

export interface AssociatedAccountRecord {
  id: string;
  primarySubscriberId: string;
  secondaryMsisdn: string;
  relationship: string;
  verified: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class SubscriberRepository {
  private associatedAccounts = new Map<string, AssociatedAccountRecord>();
  private isDbAvailable: boolean | null = null;

  private async checkDb(): Promise<boolean> {
    if (this.isDbAvailable === null) {
      this.isDbAvailable = await checkDatabaseHealth();
    }
    return this.isDbAvailable;
  }

  async findAssociatedAccounts(primarySubscriberId: string): Promise<AssociatedAccountRecord[]> {
    if (await this.checkDb()) {
      try {
        const records = await prisma.associatedAccount.findMany({
          where: { primarySubscriberId }
        });
        return records as AssociatedAccountRecord[];
      } catch {
        this.isDbAvailable = false;
      }
    }
    return Array.from(this.associatedAccounts.values()).filter(
      acc => acc.primarySubscriberId === primarySubscriberId
    );
  }

  async findAssociatedAccountById(id: string): Promise<AssociatedAccountRecord | null> {
    if (await this.checkDb()) {
      try {
        const rec = await prisma.associatedAccount.findUnique({ where: { id } });
        if (rec) return rec as AssociatedAccountRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }
    return this.associatedAccounts.get(id) || null;
  }

  async findAssociatedAccountByMsisdn(primarySubscriberId: string, secondaryMsisdn: string): Promise<AssociatedAccountRecord | null> {
    if (await this.checkDb()) {
      try {
        const rec = await prisma.associatedAccount.findUnique({
          where: {
            primarySubscriberId_secondaryMsisdn: {
              primarySubscriberId,
              secondaryMsisdn
            }
          }
        });
        if (rec) return rec as AssociatedAccountRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }
    for (const acc of this.associatedAccounts.values()) {
      if (acc.primarySubscriberId === primarySubscriberId && acc.secondaryMsisdn === secondaryMsisdn) {
        return acc;
      }
    }
    return null;
  }

  async createAssociatedAccount(data: {
    primarySubscriberId: string;
    secondaryMsisdn: string;
    relationship?: string;
    permissions?: string[];
  }): Promise<AssociatedAccountRecord> {
    const id = uuidv4();
    const now = new Date();
    const record: AssociatedAccountRecord = {
      id,
      primarySubscriberId: data.primarySubscriberId,
      secondaryMsisdn: data.secondaryMsisdn,
      relationship: data.relationship || 'SECONDARY',
      verified: false,
      permissions: data.permissions || ['VIEW_BALANCE', 'RECHARGE'],
      createdAt: now,
      updatedAt: now
    };

    if (await this.checkDb()) {
      try {
        const created = await prisma.associatedAccount.create({
          data: {
            id: record.id,
            primarySubscriberId: record.primarySubscriberId,
            secondaryMsisdn: record.secondaryMsisdn,
            relationship: record.relationship,
            verified: record.verified,
            permissions: record.permissions
          }
        });
        this.associatedAccounts.set(id, created as AssociatedAccountRecord);
        return created as AssociatedAccountRecord;
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.associatedAccounts.set(id, record);
    return record;
  }

  async verifyAssociatedAccount(id: string): Promise<void> {
    const acc = this.associatedAccounts.get(id);
    if (acc) {
      acc.verified = true;
      acc.updatedAt = new Date();
    }
    if (await this.checkDb()) {
      try {
        await prisma.associatedAccount.update({
          where: { id },
          data: { verified: true }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }
  }

  async deleteAssociatedAccount(primarySubscriberId: string, id: string): Promise<boolean> {
    const acc = this.associatedAccounts.get(id);
    if (acc && acc.primarySubscriberId === primarySubscriberId) {
      this.associatedAccounts.delete(id);
      if (await this.checkDb()) {
        try {
          await prisma.associatedAccount.delete({ where: { id } });
        } catch {
          this.isDbAvailable = false;
        }
      }
      return true;
    }
    return false;
  }

  clearMemory(): void {
    this.associatedAccounts.clear();
  }
}

export const subscriberRepository = new SubscriberRepository();

