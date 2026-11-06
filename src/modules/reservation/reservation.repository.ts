import { v4 as uuidv4 } from 'uuid';
import { prisma, checkDatabaseHealth } from '../../database/prisma';

export interface NumberRecord {
  id: string;
  msisdn: string;
  category: 'NORMAL' | 'SILVER' | 'GOLD' | 'PLATINUM';
  price: number;
  status: 'AVAILABLE' | 'RESERVED' | 'ASSIGNED' | 'EXPIRED' | 'CANCELLED';
  reservedById?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ReservationRepository {
  private numbers = new Map<string, NumberRecord>();
  private isDbAvailable: boolean | null = null;

  constructor() {
    this.seedAvailableNumbers();
  }

  private seedAvailableNumbers() {
    const seed = [
      { msisdn: '2348011112222', category: 'PLATINUM' as const, price: 50000 },
      { msisdn: '2348022223333', category: 'GOLD' as const, price: 25000 },
      { msisdn: '2348033334444', category: 'SILVER' as const, price: 10000 },
      { msisdn: '2348055556789', category: 'NORMAL' as const, price: 1000 },
      { msisdn: '2348055556790', category: 'NORMAL' as const, price: 1000 },
      { msisdn: '2348055556791', category: 'NORMAL' as const, price: 1000 },
      { msisdn: '2348055556792', category: 'NORMAL' as const, price: 1000 },
      { msisdn: '2348055556793', category: 'NORMAL' as const, price: 1000 }
    ];

    const now = new Date();
    for (const item of seed) {
      const id = uuidv4();
      this.numbers.set(item.msisdn, {
        id,
        msisdn: item.msisdn,
        category: item.category,
        price: item.price,
        status: 'AVAILABLE',
        createdAt: now,
        updatedAt: now
      });
    }
  }

  private async checkDb(): Promise<boolean> {
    if (this.isDbAvailable === null) {
      this.isDbAvailable = await checkDatabaseHealth();
    }
    return this.isDbAvailable;
  }

  async searchNumbers(pattern?: string, category?: string, limit: number = 20): Promise<NumberRecord[]> {
    const now = new Date();
    // Auto-release expired reservations
    for (const item of this.numbers.values()) {
      if (item.status === 'RESERVED' && item.expiresAt && item.expiresAt < now) {
        item.status = 'AVAILABLE';
        item.reservedById = null;
        item.expiresAt = null;
      }
    }

    let results = Array.from(this.numbers.values()).filter(n => n.status === 'AVAILABLE');

    if (category) {
      results = results.filter(n => n.category === category);
    }

    if (pattern) {
      results = results.filter(n => n.msisdn.includes(pattern));
    }

    return results.slice(0, limit);
  }

  async findByMsisdn(msisdn: string): Promise<NumberRecord | null> {
    const item = this.numbers.get(msisdn);
    if (!item) return null;

    // Check expiry
    if (item.status === 'RESERVED' && item.expiresAt && item.expiresAt < new Date()) {
      item.status = 'AVAILABLE';
      item.reservedById = null;
      item.expiresAt = null;
    }
    return item;
  }

  async findById(id: string): Promise<NumberRecord | null> {
    for (const item of this.numbers.values()) {
      if (item.id === id) return item;
    }
    return null;
  }

  async reserveNumber(msisdn: string, reservedById: string, ttlMinutes: number = 15): Promise<NumberRecord | null> {
    const item = await this.findByMsisdn(msisdn);
    if (!item || item.status !== 'AVAILABLE') {
      return null;
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    item.status = 'RESERVED';
    item.reservedById = reservedById;
    item.expiresAt = expiresAt;
    item.updatedAt = new Date();

    return item;
  }

  async cancelReservation(id: string, reservedById: string): Promise<boolean> {
    const item = await this.findById(id);
    if (!item || item.reservedById !== reservedById || item.status !== 'RESERVED') {
      return false;
    }

    item.status = 'AVAILABLE';
    item.reservedById = null;
    item.expiresAt = null;
    item.updatedAt = new Date();

    return true;
  }

  async findReservationsByUser(reservedById: string): Promise<NumberRecord[]> {
    return Array.from(this.numbers.values()).filter(n => n.reservedById === reservedById);
  }

  reset(): void {
    this.numbers.clear();
    this.seedAvailableNumbers();
  }
}

export const reservationRepository = new ReservationRepository();
