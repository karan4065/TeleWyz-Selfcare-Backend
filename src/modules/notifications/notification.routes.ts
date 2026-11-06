import { Router } from 'express';
import { notificationController } from './notification.controller';
import { optionalAuthMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(optionalAuthMiddleware);

router.get('/history', notificationController.getHistory.bind(notificationController));

export default router;

