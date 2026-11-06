import { Request, Response, NextFunction } from 'express';
import { simService } from './sim.service';
import { sendSuccess } from '../../core/response';

export class SimController {
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user?.subscriberId;
      const order = await simService.createSimOrder(req.body, subscriberId);
      sendSuccess(res, order, 'SIM purchase order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const details = await simService.getOrderDetails(orderId);
      sendSuccess(res, details, 'SIM order details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async submitKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await simService.submitKyc(req.body);
      sendSuccess(res, result, 'KYC verification processed');
    } catch (error) {
      next(error);
    }
  }

  async activateSim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await simService.activateSim(req.body);
      sendSuccess(res, result, 'SIM network activation completed');
    } catch (error) {
      next(error);
    }
  }

  async getActivationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { msisdn } = req.params;
      const details = await simService.getOrderDetails(msisdn);
      sendSuccess(res, {
        msisdn: details.msisdn,
        kycStatus: details.kycStatus,
        activationStatus: details.activationStatus,
        iccid: details.iccid
      }, 'SIM activation status retrieved');
    } catch (error) {
      next(error);
    }
  }

  async requestReplacement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const result = await simService.requestSimReplacement(subscriberId, req.body);
      sendSuccess(res, result, 'SIM replacement request created', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const simController = new SimController();

