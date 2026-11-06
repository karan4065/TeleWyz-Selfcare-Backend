import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../core/errors';
import { AuthenticatedUser } from '../types/express';
import { correlationContext } from '../core/correlation';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization header missing or invalid format. Format: Bearer <token>');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError('Bearer token is empty');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired. Please refresh your session.');
      }
      throw new UnauthorizedError('Invalid access token');
    }

    const user: AuthenticatedUser = {
      subscriberId: decoded.subscriberId,
      msisdn: decoded.msisdn,
      role: decoded.role || 'SUBSCRIBER',
      accountType: decoded.accountType,
      email: decoded.email,
      firebaseUid: decoded.firebaseUid
    };

    req.user = user;

    // Update correlation context with subscriber details
    const currentContext = correlationContext.get();
    if (currentContext) {
      currentContext.subscriberId = user.subscriberId;
      currentContext.msisdn = user.msisdn;
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Optional auth middleware for routes where authentication is optional
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return authMiddleware(req, res, next);
}
