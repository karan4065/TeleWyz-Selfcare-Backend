import { Request, Response, NextFunction } from 'express';
import { subscriberService } from './subscriber.service';
import { sendSuccess } from '../../core/response';

export class SubscriberController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const profile = await subscriberService.getProfile(subscriberId);
      sendSuccess(res, profile, 'Subscriber profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const updated = await subscriberService.updateProfile(subscriberId, req.body);
      sendSuccess(res, updated, 'Subscriber profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const targetMsisdn = req.query.msisdn as string | undefined;
      const usage = await subscriberService.getUsage(subscriberId, targetMsisdn);
      sendSuccess(res, usage, 'Usage information retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getAssociatedAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const accounts = await subscriberService.getAssociatedAccounts(subscriberId);
      sendSuccess(res, accounts, 'Associated accounts retrieved');
    } catch (error) {
      next(error);
    }
  }

  async linkAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const result = await subscriberService.linkAssociatedAccount(subscriberId, req.body);
      sendSuccess(res, result, 'Account linking initiated', 201);
    } catch (error) {
      next(error);
    }
  }

  async verifyLinkAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const result = await subscriberService.verifyAssociatedAccount(subscriberId, req.body);
      sendSuccess(res, result, 'Associated account verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async delinkAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const { id } = req.params;
      const result = await subscriberService.delinkAssociatedAccount(subscriberId, id);
      sendSuccess(res, result, 'Account delinked successfully');
    } catch (error) {
      next(error);
    }
  }

  async switchAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const result = await subscriberService.switchAccount(subscriberId, req.body);
      sendSuccess(res, result, 'Active account context switched');
    } catch (error) {
      next(error);
    }
  }
}

export const subscriberController = new SubscriberController();

