import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../database/redis';
import { RateLimitError } from '../core/errors';
import { config } from '../config';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || config.RATE_LIMIT_WINDOW_MS;
  const max = options.max || config.RATE_LIMIT_MAX_REQUESTS;
  const ttlSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const keyPrefix = options.keyGenerator 
        ? options.keyGenerator(req) 
        : (req.ip || req.socket.remoteAddress || 'unknown-ip');
      
      const rateKey = `ratelimit:${keyPrefix}:${req.path}`;
      const hits = await cacheService.incr(rateKey, ttlSeconds);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - hits));

      if (hits > max) {
        const ttl = await cacheService.ttl(rateKey);
        res.setHeader('Retry-After', ttl > 0 ? ttl : ttlSeconds);
        throw new RateLimitError(`Rate limit of ${max} requests per ${ttlSeconds}s exceeded`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export const globalRateLimitMiddleware = createRateLimiter();
