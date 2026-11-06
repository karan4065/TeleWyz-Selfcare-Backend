import { ExternalServiceError } from '../core/errors';
import { logger } from '../core/logger';
import { correlationContext } from '../core/correlation';

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  backoffFactor: number;
}

export abstract class BaseAdapter {
  protected serviceName: string;
  protected timeoutMs: number;
  protected retryPolicy: RetryPolicy;

  constructor(
    serviceName: string,
    timeoutMs: number = 5000,
    retryPolicy: RetryPolicy = { maxRetries: 2, initialDelayMs: 200, backoffFactor: 2 }
  ) {
    this.serviceName = serviceName;
    this.timeoutMs = timeoutMs;
    this.retryPolicy = retryPolicy;
  }

  protected async executeWithRetry<T>(
    operationName: string,
    fn: () => Promise<T>,
    isSafeOrIdempotent: boolean = true
  ): Promise<T> {
    const correlationId = correlationContext.getCorrelationId();
    let attempt = 0;
    let delay = this.retryPolicy.initialDelayMs;

    while (attempt <= this.retryPolicy.maxRetries) {
      try {
        const startTime = Date.now();
        let timer: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Timeout of ${this.timeoutMs}ms exceeded`)), this.timeoutMs);
        });

        try {
          const result = await Promise.race([fn(), timeoutPromise]);
          const duration = Date.now() - startTime;

          logger.debug(
            { service: this.serviceName, operation: operationName, durationMs: duration, correlationId },
            `External service call succeeded: ${this.serviceName}.${operationName}`
          );

          return result;
        } finally {
          if (timer) clearTimeout(timer);
        }
      } catch (err: any) {
        attempt++;
        const isTimeout = err.message && err.message.includes('Timeout');

        logger.warn(
          {
            service: this.serviceName,
            operation: operationName,
            attempt,
            maxRetries: this.retryPolicy.maxRetries,
            error: err.message,
            correlationId
          },
          `External service call failed: ${this.serviceName}.${operationName}`
        );

        // Do not retry non-idempotent operations unless timeout before dispatch
        if (!isSafeOrIdempotent || attempt > this.retryPolicy.maxRetries) {
          throw new ExternalServiceError(
            this.serviceName,
            `${operationName} failed: ${err.message}`,
            { service: this.serviceName, operation: operationName, isTimeout, correlationId }
          );
        }

        // Wait before next retry
        await new Promise(res => setTimeout(res, delay));
        delay *= this.retryPolicy.backoffFactor;
      }
    }

    throw new ExternalServiceError(this.serviceName, `${operationName} exceeded maximum retry attempts`);
  }
}
