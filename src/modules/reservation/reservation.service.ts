import { reservationRepository, NumberRecord } from './reservation.repository';
import { cacheService } from '../../database/redis';
import { BadRequestError, ConflictError, NotFoundError } from '../../core/errors';

export class ReservationService {
  async searchAvailableNumbers(pattern?: string, category?: string, limit?: number): Promise<NumberRecord[]> {
    return reservationRepository.searchNumbers(pattern, category, limit);
  }

  async checkNumberAvailability(msisdn: string) {
    const record = await reservationRepository.findByMsisdn(msisdn);
    if (!record) {
      return { msisdn, available: false, reason: 'Number is not in inventory' };
    }
    return {
      msisdn,
      available: record.status === 'AVAILABLE',
      category: record.category,
      price: record.price,
      status: record.status
    };
  }

  async reserveNumber(msisdn: string, reservedById: string, ttlMinutes: number = 15): Promise<NumberRecord> {
    const lockKey = `lock:reserve:${msisdn}`;
    
    // Acquire atomic concurrency lock
    const acquired = await cacheService.incr(lockKey, 10);
    if (acquired > 1) {
      throw new ConflictError(`Number ${msisdn} is currently being processed by another customer. Please retry in a moment.`);
    }

    try {
      const available = await reservationRepository.findByMsisdn(msisdn);
      if (!available || available.status !== 'AVAILABLE') {
        throw new BadRequestError(`Number ${msisdn} is not available for reservation (Status: ${available?.status || 'NOT_FOUND'})`);
      }

      const reserved = await reservationRepository.reserveNumber(msisdn, reservedById, ttlMinutes);
      if (!reserved) {
        throw new BadRequestError(`Failed to reserve number ${msisdn}`);
      }

      return reserved;
    } finally {
      // Release concurrency lock
      await cacheService.del(lockKey);
    }
  }

  async getReservation(id: string) {
    const item = await reservationRepository.findById(id);
    if (!item) throw new NotFoundError('Reservation not found');
    return item;
  }

  async cancelReservation(id: string, reservedById: string) {
    const success = await reservationRepository.cancelReservation(id, reservedById);
    if (!success) {
      throw new BadRequestError('Reservation could not be cancelled. It may have expired or belongs to another user.');
    }
    return { success: true, message: 'Reservation cancelled successfully. Number released back to inventory.' };
  }

  async getUserReservations(reservedById: string) {
    return reservationRepository.findReservationsByUser(reservedById);
  }
}

export const reservationService = new ReservationService();

