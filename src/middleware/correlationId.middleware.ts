import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { correlationContext } from '../core/correlation';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || (req.headers['x-request-id'] as string) || uuidv4();
  
  // Set response header
  res.setHeader('x-correlation-id', correlationId);

  correlationContext.run({ correlationId }, () => {
    next();
  });
}
