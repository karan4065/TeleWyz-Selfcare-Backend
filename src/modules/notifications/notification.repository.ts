import { v4 as uuidv4 } from 'uuid';
import { prisma, checkDatabaseHealth } from '../../database/prisma';

export interface NotificationRecordData {
  id: string;
  recipient: string;
  channel: 'SMS' | 'EMAIL' | 'PUSH';
  template: string;
  subject?: string | null;
  body: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  error?: string | null;
  createdAt: Date;
}

export class NotificationRepository {
  private records = new Map<string, NotificationRecordData>();
  private isDbAvailable: boolean | null = null;

  private async checkDb(): Promise<boolean> {
    if (this.isDbAvailable === null) {
      this.isDbAvailable = await checkDatabaseHealth();
    }
    return this.isDbAvailable;
  }

  async create(data: Omit<NotificationRecordData, 'id' | 'createdAt'>): Promise<NotificationRecordData> {
    const id = uuidv4();
    const now = new Date();
    const record: NotificationRecordData = {
      ...data,
      id,
      createdAt: now
    };

    if (await this.checkDb()) {
      try {
        await prisma.notificationRecord.create({
          data: {
            id: record.id,
            recipient: record.recipient,
            channel: record.channel as any,
            template: record.template,
            subject: record.subject,
            body: record.body,
            status: record.status as any,
            error: record.error
          }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }

    this.records.set(id, record);
    return record;
  }

  async updateStatus(id: string, status: 'SENT' | 'FAILED', error?: string): Promise<void> {
    const rec = this.records.get(id);
    if (rec) {
      rec.status = status;
      if (error) rec.error = error;
    }
    if (await this.checkDb()) {
      try {
        await prisma.notificationRecord.update({
          where: { id },
          data: { status: status as any, error: error || null }
        });
      } catch {
        this.isDbAvailable = false;
      }
    }
  }

  async findByRecipient(recipient: string): Promise<NotificationRecordData[]> {
    return Array.from(this.records.values())
      .filter(r => r.recipient === recipient)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  clearMemory(): void {
    this.records.clear();
  }
}

export const notificationRepository = new NotificationRepository();

