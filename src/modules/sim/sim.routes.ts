import { Router } from 'express';
import { simController } from './sim.controller';
import { validate } from '../../middleware/validate.middleware';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.middleware';
import { auditLogMiddleware } from '../../middleware/auditLog.middleware';
import {
  createSimOrderSchema,
  submitKycSchema,
  activateSimSchema,
  simReplacementSchema
} from './sim.dto';

const router = Router();

// Public / Semi-public SIM purchase and activation workflows
router.post(
  '/order',
  optionalAuthMiddleware,
  validate(createSimOrderSchema),
  auditLogMiddleware('CREATE_SIM_ORDER', 'SIM'),
  simController.createOrder.bind(simController)
);

router.get('/order/:orderId', simController.getOrder.bind(simController));

router.post(
  '/kyc/verify',
  validate(submitKycSchema),
  auditLogMiddleware('SUBMIT_SIM_KYC', 'SIM'),
  simController.submitKyc.bind(simController)
);

router.post(
  '/activate',
  validate(activateSimSchema),
  auditLogMiddleware('ACTIVATE_SIM', 'SIM'),
  simController.activateSim.bind(simController)
);

router.get('/activation-status/:msisdn', simController.getActivationStatus.bind(simController));

// Authenticated SIM Replacement
router.post(
  '/replace',
  authMiddleware,
  validate(simReplacementSchema),
  auditLogMiddleware('REPLACE_SIM', 'SIM'),
  simController.requestReplacement.bind(simController)
);

export default router;

