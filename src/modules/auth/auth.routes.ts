import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rateLimit.middleware';
import { auditLogMiddleware } from '../../middleware/auditLog.middleware';
import {
  sendOtpSchema,
  verifyOtpSchema,
  resendOtpSchema,
  firebaseLoginSchema,
  refreshTokenSchema
} from './auth.dto';

const router = Router();

// Strict rate limiters for authentication endpoints to prevent brute-force attacks
const otpSendLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  keyGenerator: (req) => `${req.ip}:${req.body.msisdn || ''}`
});

const otpVerifyLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => `${req.ip}:${req.body.msisdn || ''}`
});

// Public Auth Endpoints
router.post(
  '/otp/send',
  otpSendLimiter,
  validate(sendOtpSchema),
  auditLogMiddleware('AUTH_OTP_SEND', 'AUTH'),
  authController.sendOtp.bind(authController)
);

router.post(
  '/otp/verify',
  otpVerifyLimiter,
  validate(verifyOtpSchema),
  auditLogMiddleware('AUTH_OTP_VERIFY', 'AUTH'),
  authController.verifyOtp.bind(authController)
);

router.post(
  '/otp/resend',
  otpSendLimiter,
  validate(resendOtpSchema),
  auditLogMiddleware('AUTH_OTP_RESEND', 'AUTH'),
  authController.resendOtp.bind(authController)
);

router.post(
  '/firebase-login',
  validate(firebaseLoginSchema),
  auditLogMiddleware('AUTH_FIREBASE_LOGIN', 'AUTH'),
  authController.firebaseLogin.bind(authController)
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refresh.bind(authController)
);

// Protected Auth Endpoints
router.post(
  '/logout',
  authMiddleware,
  auditLogMiddleware('AUTH_LOGOUT', 'AUTH'),
  authController.logout.bind(authController)
);

router.get(
  '/sessions',
  authMiddleware,
  authController.getSessions.bind(authController)
);

router.delete(
  '/sessions/:sessionId',
  authMiddleware,
  auditLogMiddleware('AUTH_REVOKE_SESSION', 'AUTH'),
  authController.revokeSession.bind(authController)
);

export default router;

