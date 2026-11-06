import { Request, Response, NextFunction } from 'express';
import { additionalServicesService } from './services.service';
import { sendSuccess } from '../../core/response';

export class ServicesController {
  async getLoyalty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const details = await additionalServicesService.getLoyaltyDetails(subscriberId);
      sendSuccess(res, details, 'Loyalty account details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async redeemLoyalty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const result = await additionalServicesService.redeemLoyaltyPoints(subscriberId, req.body);
      sendSuccess(res, result, 'Loyalty points redeemed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStores(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const city = req.query.city as string | undefined;
      const stores = await additionalServicesService.getStores(city);
      sendSuccess(res, stores, 'Stores and authorized dealers retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getCoverage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = req.query.state as string | undefined;
      const city = req.query.city as string | undefined;
      const coverage = await additionalServicesService.getCoverage(state, city);
      sendSuccess(res, coverage, 'Network coverage data retrieved');
    } catch (error) {
      next(error);
    }
  }

  async createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user?.subscriberId;
      const msisdn = req.user?.msisdn || (req.body.msisdn as string) || '2348012345678';
      const ticket = await additionalServicesService.createSupportTicket(subscriberId, msisdn, req.body);
      sendSuccess(res, ticket, 'Customer support ticket submitted', 201);
    } catch (error) {
      next(error);
    }
  }

  async getTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ticketNumber } = req.params;
      const ticket = await additionalServicesService.getSupportTicketStatus(ticketNumber);
      sendSuccess(res, ticket, 'Ticket details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getAdminMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await additionalServicesService.getAdminOperationalMetrics();
      sendSuccess(res, metrics, 'Admin operational telemetry retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const servicesController = new ServicesController();

