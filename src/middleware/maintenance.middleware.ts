import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { MaintenanceError } from '../core/errors';

export function maintenanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow health-checks even during maintenance
  if (req.path === '/api/v1/health' || req.path === '/health') {
    return next();
  }

  if (config.MAINTENANCE_MODE) {
    throw new MaintenanceError('System is currently undergoing scheduled maintenance. Please try again shortly.');
  }

  next();
}
