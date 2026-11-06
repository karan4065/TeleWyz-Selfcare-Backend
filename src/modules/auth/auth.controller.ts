import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../core/response';

export class AuthController {
  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.sendOtp(req.body);
      sendSuccess(res, result, 'OTP sent successfully');
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deviceInfo = {
        deviceId: req.body.deviceId,
        deviceType: req.body.deviceType,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const result = await authService.verifyOtp(req.body, deviceInfo);
      sendSuccess(res, result, 'Verification and login successful');
    } catch (error) {
      next(error);
    }
  }

  async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.sendOtp(req.body);
      sendSuccess(res, result, 'OTP resent successfully');
    } catch (error) {
      next(error);
    }
  }

  async firebaseLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deviceInfo = {
        deviceId: req.body.deviceId,
        deviceType: req.body.deviceType,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };
      const result = await authService.loginWithFirebase(req.body, deviceInfo);
      sendSuccess(res, result, 'Firebase authentication successful');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.refreshAccessToken(req.body.refreshToken);
      sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = (req.user as any)?.sessionId;
      if (sessionId) {
        await authService.logout(sessionId);
      }
      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const sessions = await authService.getActiveSessions(subscriberId);
      sendSuccess(res, sessions, 'Active sessions retrieved');
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriberId = req.user!.subscriberId;
      const { sessionId } = req.params;
      await authService.revokeSession(subscriberId, sessionId);
      sendSuccess(res, null, 'Session revoked successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

