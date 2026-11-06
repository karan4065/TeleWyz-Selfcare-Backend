import { Router } from 'express';
import { servicesController } from './services.controller';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { auditLogMiddleware } from '../../middleware/auditLog.middleware';
import {
  redeemLoyaltySchema,
  createSupportTicketSchema,
  storeLocatorQuerySchema,
  coverageQuerySchema
} from './services.dto';

const router = Router();

// Public services (Coverage and Store locator)
router.get('/stores', validate(storeLocatorQuerySchema), servicesController.getStores.bind(servicesController));
router.get('/coverage', validate(coverageQuerySchema), servicesController.getCoverage.bind(servicesController));

// Support tickets (Public or authenticated)
router.post(
  '/support/tickets',
  optionalAuthMiddleware,
  validate(createSupportTicketSchema),
  auditLogMiddleware('CREATE_SUPPORT_TICKET', 'SUPPORT'),
  servicesController.createTicket.bind(servicesController)
);
router.get('/support/tickets/:ticketNumber', servicesController.getTicket.bind(servicesController));

// Authenticated Loyalty & Rewards
router.get('/loyalty', authMiddleware, servicesController.getLoyalty.bind(servicesController));
router.post(
  '/loyalty/redeem',
  authMiddleware,
  validate(redeemLoyaltySchema),
  auditLogMiddleware('REDEEM_LOYALTY_POINTS', 'LOYALTY'),
  servicesController.redeemLoyalty.bind(servicesController)
);

// Admin Operational Telemetry (Restricted to ADMIN role only)
router.get(
  '/admin/metrics',
  authMiddleware,
  rbacMiddleware(['ADMIN']),
  servicesController.getAdminMetrics.bind(servicesController)
);

export default router;

