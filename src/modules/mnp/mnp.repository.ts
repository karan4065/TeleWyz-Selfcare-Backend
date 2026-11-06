import { v4 as uuidv4 } from 'uuid';
import { prisma, checkDatabaseHealth } from '../../database/prisma';

export interface MnpRecord {
  id: string;
  msisdn: string;
  donorOperator: 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE';
  donorAccountNum?: string | null;
  simType: 'PHYSICAL' | 'ESIM';
  selectedPlanId?: string | null;
  deliveryAddress?: string | null;
  nin: string;
  kycReference?: string | null;
  status: 'SUBMITTED' | 'VALIDATED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string | null;
  subscriberId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class MnpRepository {
  private requests = new Map<string, MnpRecord>();
  private isDbAvailable: boolean | null = null;

  private async checkDb(): Promise<boolean> {
    if (this.isDbAvailable === null) {
      this.isDbAvailable = await checkDatabaseHealth();
    }
    return this.isDbAvailable;
  }

  async create(data: Omit<MnpRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<MnpRecord> {
    const id = uuidv4();
    const now = new Date();
    const record: MnpRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };

    if (await this.checkDb()) {
      try {
        await prisma.mnpRequest.create({
          data: {
            id: record.id,
            msisdn: record.msisdn,
            donorOperator: record.donorOperator,
            donorAccountNum: record.donorAccountNum,
            simType: record.simType,
            selectedPlanId: record.selectedPlanId,
            status: record.status as any,
            rejectionReason: record.rejectionReason,
            subscriberId: record.subscriberId
          }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.requests.set(id, record);
    return record;
  }

  async findById(id: string): Promise<MnpRecord | null> {
    return this.requests.get(id) || null;
  }

  async findByMsisdn(msisdn: string): Promise<MnpRecord | null> {
    for (const req of this.requests.values()) {
      if (req.msisdn === msisdn) return req;
    }
    return null;
  }

  async update(id: string, updates: Partial<MnpRecord>): Promise<MnpRecord> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('MNP Request not found');

    const updated: MnpRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };

    this.requests.set(id, updated);
    return updated;
  }

  clearMemory(): void {
    this.requests.clear();
  }
}

export const mnpRepository = new MnpRepository();

