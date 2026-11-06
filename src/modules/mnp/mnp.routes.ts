import { Router } from 'express';
import { mnpController } from './mnp.controller';
import { validate } from '../../middleware/validate.middleware';
import { optionalAuthMiddleware } from '../../middleware/auth.middleware';
import { auditLogMiddleware } from '../../middleware/auditLog.middleware';
import {
  validateMnpEligibilitySchema,
  createMnpRequestSchema,
  cancelMnpSchema
} from './mnp.dto';

const router = Router();

router.use(optionalAuthMiddleware);

router.post(
  '/validate',
  validate(validateMnpEligibilitySchema),
  mnpController.validateEligibility.bind(mnpController)
);

router.post(
  '/request',
  validate(createMnpRequestSchema),
  auditLogMiddleware('SUBMIT_MNP_REQUEST', 'MNP'),
  mnpController.submitRequest.bind(mnpController)
);

router.get('/status/:requestId', mnpController.getStatus.bind(mnpController));

router.post(
  '/:requestId/cancel',
  validate(cancelMnpSchema),
  auditLogMiddleware('CANCEL_MNP_REQUEST', 'MNP'),
  mnpController.cancelRequest.bind(mnpController)
);

export default router;

