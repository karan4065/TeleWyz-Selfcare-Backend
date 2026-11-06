import { z } from 'zod';
import { phoneRegex } from '../auth/auth.dto';

export const validateMnpEligibilitySchema = {
  body: z.object({
    msisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits'),
    donorOperator: z.enum(['MTN', 'AIRTEL', 'GLO', '9MOBILE']),
    accountType: z.enum(['PREPAID', 'POSTPAID']).default('PREPAID')
  })
};

export const createMnpRequestSchema = {
  body: z.object({
    msisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits'),
    donorOperator: z.enum(['MTN', 'AIRTEL', 'GLO', '9MOBILE']),
    donorAccountNum: z.string().optional(),
    simType: z.enum(['PHYSICAL', 'ESIM']),
    selectedPlanId: z.string().optional(),
    deliveryAddress: z.string().optional(),
    nin: z.string().length(11, 'NIN must be 11 digits')
  }).refine(data => {
    if (data.simType === 'PHYSICAL' && (!data.deliveryAddress || data.deliveryAddress.trim().length === 0)) {
      return false;
    }
    return true;
  }, {
    message: 'Delivery address is required for Physical SIM porting request'
  })
};

export const cancelMnpSchema = {
  body: z.object({
    reason: z.string().min(3).max(255)
  })
};

export type ValidateMnpEligibilityDto = z.infer<typeof validateMnpEligibilitySchema.body>;
export type CreateMnpRequestDto = z.infer<typeof createMnpRequestSchema.body>;
export type CancelMnpDto = z.infer<typeof cancelMnpSchema.body>;

