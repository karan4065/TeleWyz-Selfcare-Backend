import { Router } from 'express';
import { catalogueController } from './catalogue.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { auditLogMiddleware } from '../../middleware/auditLog.middleware';
import {
  listPlansQuerySchema,
  listPackagesQuerySchema,
  subscribeSchema,
  unsubscribeSchema
} from './catalogue.dto';

const router = Router();

// Public catalogue browsing (anyone can view available plans and packages)
router.get('/plans', validate(listPlansQuerySchema), catalogueController.listPlans.bind(catalogueController));
router.get('/plans/:planId', catalogueController.getPlanDetails.bind(catalogueController));
router.get('/packages', validate(listPackagesQuerySchema), catalogueController.listPackages.bind(catalogueController));

// Authenticated subscriber subscription operations
router.get('/offers', authMiddleware, catalogueController.listOffers.bind(catalogueController));
router.get('/subscriptions', authMiddleware, catalogueController.getSubscriptions.bind(catalogueController));

router.post(
  '/subscribe',
  authMiddleware,
  validate(subscribeSchema),
  auditLogMiddleware('SUBSCRIBE_PACKAGE', 'CATALOGUE'),
  catalogueController.subscribe.bind(catalogueController)
);

router.post(
  '/unsubscribe',
  authMiddleware,
  validate(unsubscribeSchema),
  auditLogMiddleware('UNSUBSCRIBE_PACKAGE', 'CATALOGUE'),
  catalogueController.unsubscribe.bind(catalogueController)
);

export default router;

