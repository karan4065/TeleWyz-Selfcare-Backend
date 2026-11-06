import { Router } from 'express';
import { ordersController } from './orders.controller';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.middleware';
import { rbacMiddleware } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { auditLogMiddleware } from '../../middleware/auditLog.middleware';
import {
  createOrderSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema
} from './orders.dto';

const router = Router();

// 6-month historical activity ledger (requires subscriber authentication)
router.get(
  '/history/six-month',
  authMiddleware,
  ordersController.getSixMonthHistory.bind(ordersController)
);

// List subscriber orders
router.get(
  '/',
  authMiddleware,
  validate(listOrdersQuerySchema),
  ordersController.list.bind(ordersController)
);

// Create order
router.post(
  '/',
  optionalAuthMiddleware,
  validate(createOrderSchema),
  auditLogMiddleware('CREATE_ORDER', 'ORDERS'),
  ordersController.create.bind(ordersController)
);

// Get single order details
router.get(
  '/:orderId',
  optionalAuthMiddleware,
  ordersController.getDetails.bind(ordersController)
);

// Update order status (Restricted to AGENT or ADMIN)
router.patch(
  '/:orderId/status',
  authMiddleware,
  rbacMiddleware(['AGENT', 'ADMIN']),
  validate(updateOrderStatusSchema),
  auditLogMiddleware('UPDATE_ORDER_STATUS', 'ORDERS'),
  ordersController.updateStatus.bind(ordersController)
);

export default router;

