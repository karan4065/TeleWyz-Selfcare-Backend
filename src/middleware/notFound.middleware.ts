import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../core/errors';

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
}
