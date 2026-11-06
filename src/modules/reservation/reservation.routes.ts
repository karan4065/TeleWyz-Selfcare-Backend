import { Router } from 'express';
import { reservationController } from './reservation.controller';
import { validate } from '../../middleware/validate.middleware';
import { optionalAuthMiddleware } from '../../middleware/auth.middleware';
import { auditLogMiddleware } from '../../middleware/auditLog.middleware';
import { searchNumbersSchema, reserveNumberSchema } from './reservation.dto';

const router = Router();

router.use(optionalAuthMiddleware);

router.get('/search', validate(searchNumbersSchema), reservationController.search.bind(reservationController));
router.get('/:msisdn/check', reservationController.check.bind(reservationController));
router.get('/reservations', reservationController.listUserReservations.bind(reservationController));
router.get('/reservations/:id', reservationController.getById.bind(reservationController));

router.post(
  '/reserve',
  validate(reserveNumberSchema),
  auditLogMiddleware('RESERVE_NUMBER', 'NUMBERS'),
  reservationController.reserve.bind(reservationController)
);

router.post(
  '/reservations/:id/cancel',
  auditLogMiddleware('CANCEL_RESERVATION', 'NUMBERS'),
  reservationController.cancel.bind(reservationController)
);

export default router;

