import { Request, Response, NextFunction } from 'express';
import { logger } from '../core/logger';
import { correlationContext } from '../core/correlation';

export function auditLogMiddleware(action: string, resource: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      // Record only when action finishes (or fails)
      const actorId = req.user?.subscriberId || 'anonymous';
      const actorRole = req.user?.role || 'GUEST';
      const correlationId = correlationContext.getCorrelationId();

      logger.info({
        type: 'AUDIT_LOG',
        action,
        resource,
        actorId,
        actorRole,
        ipAddress: req.ip || req.socket.remoteAddress,
        correlationId,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      }, `AUDIT: [${action}] on [${resource}] by [${actorId} (${actorRole})] Status: ${res.statusCode}`);
    });

    next();
  };
}
