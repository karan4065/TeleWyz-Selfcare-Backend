import { z } from 'zod';

export const phoneRegex = /^\d{10,15}$/;

export const sendOtpSchema = {
  body: z.object({
    msisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits (e.g., 2348012345678)'),
    purpose: z.enum(['LOGIN', 'LINK_ACCOUNT', 'SIM_ACTIVATION', 'TRANSACTION']).default('LOGIN')
  })
};

export const verifyOtpSchema = {
  body: z.object({
    msisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits'),
    code: z.string().length(6, 'OTP must be 6 digits'),
    purpose: z.enum(['LOGIN', 'LINK_ACCOUNT', 'SIM_ACTIVATION', 'TRANSACTION']).default('LOGIN'),
    deviceId: z.string().optional(),
    deviceType: z.string().optional()
  })
};

export const resendOtpSchema = {
  body: z.object({
    msisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits'),
    purpose: z.enum(['LOGIN', 'LINK_ACCOUNT', 'SIM_ACTIVATION', 'TRANSACTION']).default('LOGIN')
  })
};

export const firebaseLoginSchema = {
  body: z.object({
    idToken: z.string().min(1, 'Firebase ID token is required'),
    deviceId: z.string().optional(),
    deviceType: z.string().optional()
  })
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
  })
};

export type SendOtpDto = z.infer<typeof sendOtpSchema.body>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema.body>;
export type ResendOtpDto = z.infer<typeof resendOtpSchema.body>;
export type FirebaseLoginDto = z.infer<typeof firebaseLoginSchema.body>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema.body>;

