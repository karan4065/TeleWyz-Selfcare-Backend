import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../database/redis';
import { BadRequestError, ConflictError } from '../core/errors';
import { config } from '../config';

export function idempotencyMiddleware(required: boolean = true) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
      if (required) {
        return next(new BadRequestError('Missing required Idempotency-Key header for this transaction'));
      }
      return next();
    }

    req.idempotencyKey = idempotencyKey;
    const cacheKey = `idempotency:${idempotencyKey}`;

    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.status === 'PROCESSING') {
          return next(new ConflictError('A request with this Idempotency-Key is currently being processed'));
        }
        res.setHeader('X-Cache-Lookup', 'HIT');
        res.setHeader('Idempotency-Replay', 'true');
        res.status(parsed.statusCode).json(parsed.body);
        return;
      }

      // Mark in-flight
      await cacheService.set(
        cacheKey,
        JSON.stringify({ status: 'PROCESSING' }),
        60 // 60s in-flight lock
      );

      // Intercept res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Cache the completed response
        cacheService.set(
          cacheKey,
          JSON.stringify({
            status: 'COMPLETED',
            statusCode: res.statusCode,
            body
          }),
          config.IDEMPOTENCY_TTL_SECONDS
        ).catch(() => {});

        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
