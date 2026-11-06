import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { sendSuccess } from '../../core/response';

export class DashboardController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const data = await dashboardService.getDashboardSummary(subscriberId);
      sendSuccess(res, data, 'Aggregated subscriber dashboard retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();

