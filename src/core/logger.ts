import pino from 'pino';
import { correlationContext } from './correlation';

const sensitiveKeys = [
  'password',
  'otp',
  'code',
  'token',
  'accessToken',
  'refreshToken',
  'jwt',
  'authorization',
  'secret',
  'privateKey',
  'cardNumber',
  'pan',
  'cvv',
  'expiryMonth',
  'expiryYear',
  'nin',
  'bvn'
];

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  formatters: {
    log(object) {
      const store = correlationContext.get();
      if (store) {
        return {
          correlationId: store.correlationId,
          subscriberId: store.subscriberId,
          msisdn: store.msisdn,
          ...object
        };
      }
      return object;
    }
  },
  redact: {
    paths: [
      ...sensitiveKeys,
      ...sensitiveKeys.map(k => `*.${k}`),
      ...sensitiveKeys.map(k => `*.*.${k}`),
      'req.headers.authorization',
      'headers.authorization',
      'body.password',
      'body.otp',
      'body.code',
      'body.token'
    ],
    censor: '[REDACTED]'
  },
  timestamp: pino.stdTimeFunctions.isoTime
});
