import { v4 as uuidv4 } from 'uuid';
import { prisma, checkDatabaseHealth } from '../../database/prisma';

export interface OrderStatusHistoryRecord {
  id: string;
  orderId: string;
  previousStatus?: string | null;
  newStatus: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  subscriberId?: string | null;
  msisdn: string;
  type: 'SIM_PURCHASE' | 'RECHARGE' | 'BILL_PAYMENT' | 'MNP' | 'PLAN_SUBSCRIPTION';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalAmount: number;
  currency: string;
  metadata?: Record<string, any> | null;
  history: OrderStatusHistoryRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export class OrdersRepository {
  private orders = new Map<string, OrderRecord>();
  private isDbAvailable: boolean | null = null;

  private async checkDb(): Promise<boolean> {
    if (this.isDbAvailable === null) {
      this.isDbAvailable = await checkDatabaseHealth();
    }
    return this.isDbAvailable;
  }

  async create(data: Omit<OrderRecord, 'id' | 'history' | 'createdAt' | 'updatedAt'>): Promise<OrderRecord> {
    const id = uuidv4();
    const now = new Date();
    const historyEntry: OrderStatusHistoryRecord = {
      id: uuidv4(),
      orderId: id,
      previousStatus: null,
      newStatus: data.status,
      reason: 'Order created',
      changedBy: 'System',
      createdAt: now
    };

    const record: OrderRecord = {
      ...data,
      id,
      history: [historyEntry],
      createdAt: now,
      updatedAt: now
    };

    if (await this.checkDb()) {
      try {
        await prisma.order.create({
          data: {
            id: record.id,
            orderNumber: record.orderNumber,
            subscriberId: record.subscriberId,
            msisdn: record.msisdn,
            type: record.type as any,
            status: record.status as any,
            totalAmount: record.totalAmount,
            currency: record.currency,
            metadata: record.metadata || undefined
          }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.orders.set(id, record);
    this.orders.set(record.orderNumber, record);
    return record;
  }

  async findById(id: string): Promise<OrderRecord | null> {
    return this.orders.get(id) || null;
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderRecord | null> {
    return this.orders.get(orderNumber) || null;
  }

  async updateStatus(
    id: string,
    newStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
    reason?: string,
    changedBy?: string
  ): Promise<OrderRecord> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Order not found');

    const historyEntry: OrderStatusHistoryRecord = {
      id: uuidv4(),
      orderId: existing.id,
      previousStatus: existing.status,
      newStatus,
      reason: reason || null,
      changedBy: changedBy || 'System',
      createdAt: new Date()
    };

    existing.status = newStatus;
    existing.history.push(historyEntry);
    existing.updatedAt = new Date();

    return existing;
  }

  async findOrders(filter: {
    subscriberId?: string;
    type?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    skip?: number;
  }): Promise<{ orders: OrderRecord[]; total: number }> {
    let list = Array.from(this.orders.values()).filter((order, idx, self) =>
      self.findIndex(o => o.id === order.id) === idx
    );

    if (filter.subscriberId) {
      list = list.filter(o => o.subscriberId === filter.subscriberId);
    }
    if (filter.type) {
      list = list.filter(o => o.type === filter.type);
    }
    if (filter.status) {
      list = list.filter(o => o.status === filter.status);
    }
    if (filter.startDate) {
      list = list.filter(o => o.createdAt >= filter.startDate!);
    }
    if (filter.endDate) {
      list = list.filter(o => o.createdAt <= filter.endDate!);
    }

    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = list.length;
    const skip = filter.skip || 0;
    const limit = filter.limit || 20;

    return {
      orders: list.slice(skip, skip + limit),
      total
    };
  }

  clearMemory(): void {
    this.orders.clear();
  }
}

export const ordersRepository = new OrdersRepository();

