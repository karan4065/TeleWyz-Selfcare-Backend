import { Request, Response, NextFunction } from 'express';
import { ordersService } from './orders.service';
import { sendSuccess } from '../../core/response';

export class OrdersController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user?.subscriberId;
      const order = await ordersService.createOrder(req.body, subscriberId);
      sendSuccess(res, order, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const details = await ordersService.getOrderDetails(orderId);
      sendSuccess(res, details, 'Order details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const changedBy = req.user?.role || 'AGENT';
      const updated = await ordersService.updateOrderStatus(orderId, req.body, changedBy);
      sendSuccess(res, updated, 'Order status updated');
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const result = await ordersService.listSubscriberOrders(subscriberId, req.query as any);
      sendSuccess(res, result, 'Orders retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getSixMonthHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const msisdn = req.user!.msisdn;
      const ledger = await ordersService.getSixMonthHistoricalLedger(subscriberId, msisdn);
      sendSuccess(res, ledger, '6-month historical activity ledger retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const ordersController = new OrdersController();

