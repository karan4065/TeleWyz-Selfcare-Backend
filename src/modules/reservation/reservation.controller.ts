import { Request, Response, NextFunction } from 'express';
import { reservationService } from './reservation.service';
import { sendSuccess } from '../../core/response';

export class ReservationController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pattern = req.query.pattern as string | undefined;
      const category = req.query.category as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const numbers = await reservationService.searchAvailableNumbers(pattern, category, limit);
      sendSuccess(res, numbers, 'Available numbers retrieved');
    } catch (error) {
      next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { msisdn } = req.params;
      const availability = await reservationService.checkNumberAvailability(msisdn);
      sendSuccess(res, availability, 'Number availability checked');
    } catch (error) {
      next(error);
    }
  }

  async reserve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reservedById = req.user?.subscriberId || (req.ip || 'guest-session');
      const { msisdn, ttlMinutes } = req.body;
      const reservation = await reservationService.reserveNumber(msisdn, reservedById, ttlMinutes);
      sendSuccess(res, reservation, 'Number reserved successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const reservation = await reservationService.getReservation(id);
      sendSuccess(res, reservation, 'Reservation details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const reservedById = req.user?.subscriberId || (req.ip || 'guest-session');
      const result = await reservationService.cancelReservation(id, reservedById);
      sendSuccess(res, result, 'Reservation cancelled');
    } catch (error) {
      next(error);
    }
  }

  async listUserReservations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reservedById = req.user?.subscriberId || (req.ip || 'guest-session');
      const reservations = await reservationService.getUserReservations(reservedById);
      sendSuccess(res, reservations, 'User reservations retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const reservationController = new ReservationController();

