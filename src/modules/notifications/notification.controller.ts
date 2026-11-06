import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';
import { sendSuccess } from '../../core/response';

export class NotificationController {
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recipient = req.user?.msisdn || (req.query.recipient as string);
      if (!recipient) {
        res.status(400).json({ success: false, message: 'Recipient MSISDN is required' });
        return;
      }
      const history = await notificationService.getNotificationHistory(recipient);
      sendSuccess(res, history, 'Notification history retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();

