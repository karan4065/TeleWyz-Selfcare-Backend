import { Request, Response, NextFunction } from 'express';
import { logger } from '../core/logger';
import { correlationContext } from '../core/correlation';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const correlationId = correlationContext.getCorrelationId();

    logger.info({
      type: 'HTTP_REQUEST',
      correlationId,
      method,
      url: originalUrl,
      statusCode,
      durationMs: duration,
      ip: ip || req.socket.remoteAddress
    }, `${method} ${originalUrl} ${statusCode} - ${duration}ms`);
  });

  next();
}
