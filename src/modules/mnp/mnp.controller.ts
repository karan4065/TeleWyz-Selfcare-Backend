import { Request, Response, NextFunction } from 'express';
import { mnpService } from './mnp.service';
import { sendSuccess } from '../../core/response';

export class MnpController {
  async validateEligibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await mnpService.validateEligibility(req.body);
      sendSuccess(res, result, 'MNP eligibility check completed');
    } catch (error) {
      next(error);
    }
  }

  async submitRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user?.subscriberId;
      const result = await mnpService.submitMnpRequest(req.body, subscriberId);
      sendSuccess(res, result, 'MNP porting request submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { requestId } = req.params;
      const result = await mnpService.getMnpStatus(requestId);
      sendSuccess(res, result, 'MNP porting status retrieved');
    } catch (error) {
      next(error);
    }
  }

  async cancelRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { requestId } = req.params;
      const result = await mnpService.cancelMnpRequest(requestId, req.body);
      sendSuccess(res, result, 'MNP porting request cancelled');
    } catch (error) {
      next(error);
    }
  }
}

export const mnpController = new MnpController();

