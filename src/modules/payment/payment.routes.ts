import { Router } from 'express';
import { paymentController } from './payment.controller';
import { validate } from '../../middleware/validate.middleware';
import { optionalAuthMiddleware } from '../../middleware/auth.middleware';
import { idempotencyMiddleware } from '../../middleware/idempotency.middleware';
import { verifyWebhookSignature } from '../../middleware/webhookSignature.middleware';
import { auditLogMiddleware } from '../../middleware/auditLog.middleware';
import {
  initiateRechargeSchema,
  payPostpaidBillSchema,
  paymentWebhookSchema
} from './payment.dto';

const router = Router();

router.use(optionalAuthMiddleware);

router.get('/recharge-catalogue', paymentController.getCatalogue.bind(paymentController));
router.get('/bills/current', paymentController.getCurrentBill.bind(paymentController));
router.get('/history', paymentController.getHistory.bind(paymentController));
router.get('/verify/:transactionId', paymentController.verify.bind(paymentController));

router.post(
  '/recharge',
  idempotencyMiddleware(false),
  validate(initiateRechargeSchema),
  auditLogMiddleware('INITIATE_RECHARGE', 'PAYMENT'),
  paymentController.initiateRecharge.bind(paymentController)
);

router.post(
  '/bills/pay',
  idempotencyMiddleware(false),
  validate(payPostpaidBillSchema),
  auditLogMiddleware('PAY_POSTPAID_BILL', 'PAYMENT'),
  paymentController.payBill.bind(paymentController)
);

// Payment Gateway Webhook Callback
router.post(
  '/webhook',
  verifyWebhookSignature(),
  validate(paymentWebhookSchema),
  auditLogMiddleware('PAYMENT_WEBHOOK', 'PAYMENT'),
  paymentController.webhook.bind(paymentController)
);

export default router;

