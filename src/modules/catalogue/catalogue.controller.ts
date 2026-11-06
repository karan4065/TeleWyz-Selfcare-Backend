import { Request, Response, NextFunction } from 'express';
import { catalogueService } from './catalogue.service';
import { sendSuccess } from '../../core/response';

export class CatalogueController {
  async listPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = req.query.type as 'PREPAID' | 'POSTPAID' | undefined;
      const category = req.query.category as string | undefined;
      const plans = await catalogueService.listPlans(type, category);
      sendSuccess(res, plans, 'Product catalogue plans retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getPlanDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { planId } = req.params;
      const plan = await catalogueService.getPlanDetails(planId);
      sendSuccess(res, plan, 'Plan details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async listPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const packages = await catalogueService.listPackages(category);
      sendSuccess(res, packages, 'Add-on bundles and packages retrieved');
    } catch (error) {
      next(error);
    }
  }

  async listOffers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const offers = await catalogueService.listEligibleOffers(subscriberId);
      sendSuccess(res, offers, 'Personalized eligible offers retrieved');
    } catch (error) {
      next(error);
    }
  }

  async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const result = await catalogueService.subscribe(subscriberId, req.body);
      sendSuccess(res, result, 'Package subscription confirmed', 201);
    } catch (error) {
      next(error);
    }
  }

  async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const result = await catalogueService.unsubscribe(subscriberId, req.body.subscriptionId);
      sendSuccess(res, result, 'Unsubscribed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const history = await catalogueService.getSubscriptions(subscriberId);
      sendSuccess(res, history, 'Subscription history retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const catalogueController = new CatalogueController();

