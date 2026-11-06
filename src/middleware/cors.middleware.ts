import cors, { CorsOptions } from 'cors';
import { config } from '../config';

const getCorsOptions = (): CorsOptions => {
  if (config.CORS_ORIGIN === '*') {
    return {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'Idempotency-Key', 'x-signature'],
      credentials: false
    };
  }

  const allowedOrigins = config.CORS_ORIGIN.split(',').map(s => s.trim());
  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy: Not allowed by Access-Control-Allow-Origin'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'Idempotency-Key', 'x-signature'],
    credentials: true
  };
};

export const corsMiddleware = cors(getCorsOptions());
