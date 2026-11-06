import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../core/logger';

interface MemoryItem {
  value: string;
  expiresAt: number | null;
}

class MemoryStore {
  private store = new Map<string, MemoryItem>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const current = await this.get(key);
    const count = current ? parseInt(current, 10) + 1 : 1;
    await this.set(key, count.toString(), ttlSeconds);
    return count;
  }

  async exists(key: string): Promise<boolean> {
    const item = await this.get(key);
    return item !== null;
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item || !item.expiresAt) return -1;
    const remaining = Math.max(0, Math.floor((item.expiresAt - Date.now()) / 1000));
    return remaining;
  }

  clear(): void {
    this.store.clear();
  }
}

class CacheService {
  private redis: Redis | null = null;
  private memory = new MemoryStore();
  public isConnected = false;

  constructor() {
    if (config.REDIS_ENABLED) {
      try {
        this.redis = new Redis({
          host: config.REDIS_HOST,
          port: config.REDIS_PORT,
          password: config.REDIS_PASSWORD || undefined,
          lazyConnect: true,
          retryStrategy: () => null // don't hang if unavailable
        });

        this.redis.connect()
          .then(() => {
            this.isConnected = true;
            logger.info('Connected to Redis');
          })
          .catch((err) => {
            logger.warn({ err: err.message }, 'Redis connection failed. Falling back to in-memory store');
            this.redis = null;
          });
      } catch (err) {
        logger.warn('Failed to initialize Redis. Using in-memory fallback');
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.redis) {
      try {
        return await this.redis.get(key);
      } catch (err) {
        logger.warn({ key }, 'Redis GET failed, using in-memory');
      }
    }
    return this.memory.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.redis) {
      try {
        if (ttlSeconds) {
          await this.redis.setex(key, ttlSeconds, value);
        } else {
          await this.redis.set(key, value);
        }
        return;
      } catch (err) {
        logger.warn({ key }, 'Redis SET failed, using in-memory');
      }
    }
    await this.memory.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (err) {
        logger.warn({ key }, 'Redis DEL failed, using in-memory');
      }
    }
    await this.memory.del(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (this.isConnected && this.redis) {
      try {
        const count = await this.redis.incr(key);
        if (ttlSeconds && count === 1) {
          await this.redis.expire(key, ttlSeconds);
        }
        return count;
      } catch (err) {
        logger.warn({ key }, 'Redis INCR failed, using in-memory');
      }
    }
    return this.memory.incr(key, ttlSeconds);
  }

  async exists(key: string): Promise<boolean> {
    if (this.isConnected && this.redis) {
      try {
        const result = await this.redis.exists(key);
        return result === 1;
      } catch (err) {
        logger.warn({ key }, 'Redis EXISTS failed, using in-memory');
      }
    }
    return this.memory.exists(key);
  }

  async ttl(key: string): Promise<number> {
    if (this.isConnected && this.redis) {
      try {
        return await this.redis.ttl(key);
      } catch (err) {
        logger.warn({ key }, 'Redis TTL failed, using in-memory');
      }
    }
    return this.memory.ttl(key);
  }

  clearMemory(): void {
    this.memory.clear();
  }
}

export const cacheService = new CacheService();
