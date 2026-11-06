import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { BadRequestError, UnauthorizedError } from '../core/errors';

export function verifyWebhookSignature(secret?: string) {
  const webhookSecret = secret || config.PAYMENT_WEBHOOK_SECRET;

  return (req: Request, res: Response, next: NextFunction): void => {
    const signature = req.headers['x-signature'] as string || req.headers['x-telewyz-signature'] as string;

    if (!signature) {
      return next(new UnauthorizedError('Missing required webhook signature header (x-signature)'));
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return next(new UnauthorizedError('Invalid webhook signature verification failed'));
    }

    next();
  };
}
