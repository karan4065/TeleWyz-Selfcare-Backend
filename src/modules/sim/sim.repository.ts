import { v4 as uuidv4 } from 'uuid';
import { prisma, checkDatabaseHealth } from '../../database/prisma';

export interface SimOrderRecord {
  id: string;
  orderNumber: string;
  msisdn: string;
  simType: 'PHYSICAL' | 'ESIM';
  deliveryAddress?: string | null;
  email?: string | null;
  firstName: string;
  lastName: string;
  nin?: string | null;
  kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  kycReference?: string | null;
  activationStatus: 'PENDING' | 'ACTIVE' | 'FAILED';
  iccid: string;
  trackingNumber?: string | null;
  subscriberId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SimRepository {
  private simOrders = new Map<string, SimOrderRecord>();
  private isDbAvailable: boolean | null = null;

  private async checkDb(): Promise<boolean> {
    if (this.isDbAvailable === null) {
      this.isDbAvailable = await checkDatabaseHealth();
    }
    return this.isDbAvailable;
  }

  async createSimOrder(data: Omit<SimOrderRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SimOrderRecord> {
    const id = uuidv4();
    const now = new Date();
    const record: SimOrderRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };

    if (await this.checkDb()) {
      try {
        await prisma.simOrder.create({
          data: {
            id: record.id,
            orderNumber: record.orderNumber,
            msisdn: record.msisdn,
            simType: record.simType,
            deliveryAddress: record.deliveryAddress,
            kycStatus: record.kycStatus as any,
            kycReference: record.kycReference,
            activationStatus: record.activationStatus as any,
            iccid: record.iccid,
            subscriberId: record.subscriberId
          }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.simOrders.set(record.id, record);
    this.simOrders.set(record.orderNumber, record);
    return record;
  }

  async findByOrderNumber(orderNumber: string): Promise<SimOrderRecord | null> {
    return this.simOrders.get(orderNumber) || null;
  }

  async findById(id: string): Promise<SimOrderRecord | null> {
    return this.simOrders.get(id) || null;
  }

  async findByMsisdn(msisdn: string): Promise<SimOrderRecord | null> {
    for (const order of this.simOrders.values()) {
      if (order.msisdn === msisdn) return order;
    }
    return null;
  }

  async updateSimOrder(id: string, updates: Partial<SimOrderRecord>): Promise<SimOrderRecord> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('SIM Order not found');

    const updated: SimOrderRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    this.simOrders.set(existing.id, updated);
    this.simOrders.set(existing.orderNumber, updated);

    return updated;
  }

  clearMemory(): void {
    this.simOrders.clear();
  }
}

export const simRepository = new SimRepository();

