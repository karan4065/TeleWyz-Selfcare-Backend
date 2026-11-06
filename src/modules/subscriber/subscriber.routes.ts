import { Router } from 'express';
import { subscriberController } from './subscriber.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { auditLogMiddleware } from '../../middleware/auditLog.middleware';
import {
  updateProfileSchema,
  linkAssociatedAccountSchema,
  verifyAssociatedAccountSchema,
  switchAccountSchema
} from './subscriber.dto';

const router = Router();

// All subscriber routes require authentication
router.use(authMiddleware);

router.get('/profile', subscriberController.getProfile.bind(subscriberController));

router.patch(
  '/profile',
  validate(updateProfileSchema),
  auditLogMiddleware('UPDATE_PROFILE', 'SUBSCRIBER'),
  subscriberController.updateProfile.bind(subscriberController)
);

router.get('/usage', subscriberController.getUsage.bind(subscriberController));

// Associated Accounts Management
router.get('/associated-accounts', subscriberController.getAssociatedAccounts.bind(subscriberController));

router.post(
  '/associated-accounts/link',
  validate(linkAssociatedAccountSchema),
  auditLogMiddleware('LINK_ASSOCIATED_ACCOUNT', 'SUBSCRIBER'),
  subscriberController.linkAccount.bind(subscriberController)
);

router.post(
  '/associated-accounts/verify',
  validate(verifyAssociatedAccountSchema),
  auditLogMiddleware('VERIFY_ASSOCIATED_ACCOUNT', 'SUBSCRIBER'),
  subscriberController.verifyLinkAccount.bind(subscriberController)
);

router.delete(
  '/associated-accounts/:id',
  auditLogMiddleware('DELINK_ASSOCIATED_ACCOUNT', 'SUBSCRIBER'),
  subscriberController.delinkAccount.bind(subscriberController)
);

router.post(
  '/switch-account',
  validate(switchAccountSchema),
  auditLogMiddleware('SWITCH_ACCOUNT_CONTEXT', 'SUBSCRIBER'),
  subscriberController.switchAccount.bind(subscriberController)
);

export default router;

