import { z } from 'zod';
import { phoneRegex } from '../auth/auth.dto';

export const updateProfileSchema = {
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    email: z.string().email('Must be a valid email address').optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one field (firstName, lastName, email) must be provided'
  })
};

export const linkAssociatedAccountSchema = {
  body: z.object({
    secondaryMsisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits'),
    relationship: z.enum(['FAMILY', 'BUSINESS', 'SECONDARY', 'DEPENDENT']).default('SECONDARY'),
    permissions: z.array(z.enum(['VIEW_BALANCE', 'RECHARGE', 'MANAGE_BUNDLES'])).default(['VIEW_BALANCE', 'RECHARGE'])
  })
};

export const verifyAssociatedAccountSchema = {
  body: z.object({
    secondaryMsisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits'),
    otpCode: z.string().length(6, 'OTP must be 6 digits')
  })
};

export const switchAccountSchema = {
  body: z.object({
    targetMsisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits')
  })
};

export type UpdateProfileDto = z.infer<typeof updateProfileSchema.body>;
export type LinkAssociatedAccountDto = z.infer<typeof linkAssociatedAccountSchema.body>;
export type VerifyAssociatedAccountDto = z.infer<typeof verifyAssociatedAccountSchema.body>;
export type SwitchAccountDto = z.infer<typeof switchAccountSchema.body>;

