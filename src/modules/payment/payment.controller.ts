import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import { sendSuccess } from '../../core/response';

export class PaymentController {
  async getCatalogue(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const catalogue = paymentService.getRechargeCatalogue();
      sendSuccess(res, catalogue, 'Recharge catalogue retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getCurrentBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const msisdn = (req.query.msisdn as string) || req.user?.msisdn;
      if (!msisdn) {
        res.status(400).json({ success: false, message: 'MSISDN parameter is required' });
        return;
      }
      const bill = await paymentService.getCurrentPostpaidBill(msisdn);
      sendSuccess(res, bill, 'Current postpaid bill retrieved');
    } catch (error) {
      next(error);
    }
  }

  async initiateRecharge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user?.subscriberId;
      const idempotencyKey = req.idempotencyKey;
      const result = await paymentService.initiateRecharge(req.body, subscriberId, idempotencyKey);
      sendSuccess(res, result, 'Recharge initiated', 201);
    } catch (error) {
      next(error);
    }
  }

  async payBill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user?.subscriberId;
      const idempotencyKey = req.idempotencyKey;
      const result = await paymentService.payPostpaidBill(req.body, subscriberId, idempotencyKey);
      sendSuccess(res, result, 'Bill payment initiated', 201);
    } catch (error) {
      next(error);
    }
  }

  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionId } = req.params;
      const result = await paymentService.verifyPayment(transactionId);
      sendSuccess(res, result, 'Payment status verified');
    } catch (error) {
      next(error);
    }
  }

  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.handleWebhook(req.body);
      sendSuccess(res, result, 'Webhook processed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const msisdn = (req.query.msisdn as string) || req.user?.msisdn;
      if (!msisdn) {
        res.status(400).json({ success: false, message: 'MSISDN parameter is required' });
        return;
      }
      const history = await paymentService.getTransactionHistory(msisdn);
      sendSuccess(res, history, 'Payment transaction history retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();

