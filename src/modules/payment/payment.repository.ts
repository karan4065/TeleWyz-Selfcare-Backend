import { v4 as uuidv4 } from 'uuid';
import { prisma, checkDatabaseHealth } from '../../database/prisma';

export interface PaymentTransactionRecord {
  id: string;
  transactionId: string;
  orderId?: string | null;
  msisdn: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  type: 'RECHARGE' | 'BILL_PAYMENT' | 'SIM_PURCHASE';
  gatewayReference?: string | null;
  idempotencyKey?: string | null;
  failureReason?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RechargeRecordData {
  id: string;
  transactionId: string;
  msisdn: string;
  amount: number;
  rechargeType: string;
  bundleId?: string | null;
  status: string;
  createdAt: Date;
}

export class PaymentRepository {
  private transactions = new Map<string, PaymentTransactionRecord>();
  private recharges = new Map<string, RechargeRecordData>();
  private isDbAvailable: boolean | null = null;

  private async checkDb(): Promise<boolean> {
    if (this.isDbAvailable === null) {
      this.isDbAvailable = await checkDatabaseHealth();
    }
    return this.isDbAvailable;
  }

  async createTransaction(data: Omit<PaymentTransactionRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentTransactionRecord> {
    const id = uuidv4();
    const now = new Date();
    const record: PaymentTransactionRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };

    if (await this.checkDb()) {
      try {
        await prisma.paymentTransaction.create({
          data: {
            id: record.id,
            transactionId: record.transactionId,
            orderId: record.orderId,
            msisdn: record.msisdn,
            amount: record.amount,
            currency: record.currency,
            paymentMethod: record.paymentMethod,
            status: record.status as any,
            gatewayReference: record.gatewayReference,
            idempotencyKey: record.idempotencyKey,
            failureReason: record.failureReason
          }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.transactions.set(record.id, record);
    this.transactions.set(record.transactionId, record);
    if (record.gatewayReference) {
      this.transactions.set(record.gatewayReference, record);
    }
    return record;
  }

  async findByTransactionId(transactionId: string): Promise<PaymentTransactionRecord | null> {
    return this.transactions.get(transactionId) || null;
  }

  async findByGatewayRef(gatewayReference: string): Promise<PaymentTransactionRecord | null> {
    return this.transactions.get(gatewayReference) || null;
  }

  async findByIdempotencyKey(key: string): Promise<PaymentTransactionRecord | null> {
    for (const tx of this.transactions.values()) {
      if (tx.idempotencyKey === key) return tx;
    }
    return null;
  }

  async updateTransactionStatus(
    id: string,
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED',
    gatewayReference?: string,
    failureReason?: string
  ): Promise<PaymentTransactionRecord> {
    let tx = this.transactions.get(id);
    if (!tx) {
      for (const t of this.transactions.values()) {
        if (t.transactionId === id || t.gatewayReference === id) {
          tx = t;
          break;
        }
      }
    }

    if (!tx) throw new Error(`Transaction ${id} not found`);

    tx.status = status;
    if (gatewayReference) tx.gatewayReference = gatewayReference;
    if (failureReason) tx.failureReason = failureReason;
    if (status === 'SUCCESS') tx.paidAt = new Date();
    tx.updatedAt = new Date();

    if (tx.gatewayReference) {
      this.transactions.set(tx.gatewayReference, tx);
    }

    return tx;
  }

  async createRechargeRecord(data: Omit<RechargeRecordData, 'id' | 'createdAt'>): Promise<RechargeRecordData> {
    const id = uuidv4();
    const now = new Date();
    const record: RechargeRecordData = {
      ...data,
      id,
      createdAt: now
    };

    if (await this.checkDb()) {
      try {
        await prisma.rechargeRecord.create({
          data: {
            id: record.id,
            transactionId: record.transactionId,
            msisdn: record.msisdn,
            amount: record.amount,
            rechargeType: record.rechargeType,
            bundleId: record.bundleId,
            status: record.status
          }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.recharges.set(id, record);
    return record;
  }

  async findRechargesByMsisdn(msisdn: string): Promise<RechargeRecordData[]> {
    return Array.from(this.recharges.values())
      .filter(r => r.msisdn === msisdn)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findTransactionsByMsisdn(msisdn: string): Promise<PaymentTransactionRecord[]> {
    const seen = new Set<string>();
    const list: PaymentTransactionRecord[] = [];
    for (const tx of this.transactions.values()) {
      if (tx.msisdn === msisdn && !seen.has(tx.transactionId)) {
        seen.add(tx.transactionId);
        list.push(tx);
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  clearMemory(): void {
    this.transactions.clear();
    this.recharges.clear();
  }
}

export const paymentRepository = new PaymentRepository();

