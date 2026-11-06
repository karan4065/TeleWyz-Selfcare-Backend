import { v4 as uuidv4 } from 'uuid';
import { prisma, checkDatabaseHealth } from '../../database/prisma';

export interface SubscriptionRecord {
  id: string;
  subscriberId: string;
  msisdn: string;
  planOrBundleId: string;
  name: string;
  type: 'PLAN' | 'ADDON';
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  price: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CatalogueRepository {
  private subscriptions = new Map<string, SubscriptionRecord>();
  private isDbAvailable: boolean | null = null;

  private async checkDb(): Promise<boolean> {
    if (this.isDbAvailable === null) {
      this.isDbAvailable = await checkDatabaseHealth();
    }
    return this.isDbAvailable;
  }

  async createSubscription(data: Omit<SubscriptionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionRecord> {
    const id = uuidv4();
    const now = new Date();
    const record: SubscriptionRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };

    if (await this.checkDb()) {
      try {
        await prisma.subscriptionRecord.create({
          data: {
            id: record.id,
            subscriberId: record.subscriberId,
            msisdn: record.msisdn,
            planOrBundleId: record.planOrBundleId,
            type: record.type,
            status: record.status,
            startDate: record.startDate,
            endDate: record.endDate,
            autoRenew: record.autoRenew
          }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.subscriptions.set(id, record);
    return record;
  }

  async findSubscriptionsBySubscriber(subscriberId: string): Promise<SubscriptionRecord[]> {
    if (await this.checkDb()) {
      try {
        const records = await prisma.subscriptionRecord.findMany({
          where: { subscriberId },
          orderBy: { createdAt: 'desc' }
        });
        if (records.length > 0) return records as any;
      } catch {
        this.isDbAvailable = false;
      }
    }
    return Array.from(this.subscriptions.values())
      .filter(s => s.subscriberId === subscriberId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findSubscriptionById(id: string): Promise<SubscriptionRecord | null> {
    return this.subscriptions.get(id) || null;
  }

  async updateSubscriptionStatus(id: string, status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'): Promise<void> {
    const sub = this.subscriptions.get(id);
    if (sub) {
      sub.status = status;
      sub.updatedAt = new Date();
    }
    if (await this.checkDb()) {
      try {
        await prisma.subscriptionRecord.update({
          where: { id },
          data: { status }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }
  }

  clearMemory(): void {
    this.subscriptions.clear();
  }
}

export const catalogueRepository = new CatalogueRepository();

