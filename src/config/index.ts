import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const booleanSchema = (defaultValue: boolean) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }
    if (typeof val === 'boolean') return val;
    return defaultValue;
  }, z.boolean().default(defaultValue));

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('TeleWyz E-Care Backend'),
  API_VERSION: z.string().default('v1'),
  MAINTENANCE_MODE: booleanSchema(false),
  CORS_ORIGIN: z.string().default('*'),

  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/telewyz_ecare?schema=public'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_ENABLED: booleanSchema(false),

  JWT_SECRET: z.string().min(16).default('telewyz-super-secret-jwt-key-change-in-production-min32chars'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_SECRET: z.string().min(16).default('telewyz-super-secret-refresh-key-change-in-production-min32chars'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(60),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),

  FIREBASE_PROJECT_ID: z.string().default('telewyz-ecare'),
  FIREBASE_CLIENT_EMAIL: z.string().default('mock@telewyz-ecare.iam.gserviceaccount.com'),
  FIREBASE_PRIVATE_KEY: z.string().default('mock-key'),

  PAYMENT_WEBHOOK_SECRET: z.string().default('telewyz-payment-webhook-secret-key-32chars'),
  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().default(86400),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  USE_MOCK_BSS: booleanSchema(true),
  USE_MOCK_IAM: booleanSchema(true),
  USE_MOCK_PAYMENT: booleanSchema(true),
  USE_MOCK_SMS: booleanSchema(true),
  USE_MOCK_EMAIL: booleanSchema(true),
  USE_MOCK_KYC: booleanSchema(true),
  USE_MOCK_LOGISTICS: booleanSchema(true),
  USE_MOCK_DMP: booleanSchema(true),
  USE_MOCK_COMMUNITY: booleanSchema(true),
  USE_MOCK_CVM: booleanSchema(true),
  USE_MOCK_DWH: booleanSchema(true),

  LOG_LEVEL: z.string().default('info')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // In development/test, if any variable fails, show details
  console.error('Environment variable configuration error:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
