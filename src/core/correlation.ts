import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
  correlationId: string;
  subscriberId?: string;
  msisdn?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export const correlationContext = {
  run: <T>(context: RequestContext, fn: () => T): T => {
    return asyncLocalStorage.run(context, fn);
  },
  get: (): RequestContext | undefined => {
    return asyncLocalStorage.getStore();
  },
  getCorrelationId: (): string => {
    return asyncLocalStorage.getStore()?.correlationId || 'no-correlation-id';
  }
};
