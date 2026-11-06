import { z } from 'zod';
import { phoneRegex } from '../auth/auth.dto';

export const initiateRechargeSchema = {
  body: z.object({
    msisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits'),
    amount: z.number().min(50, 'Minimum recharge is ₦50').max(100000, 'Maximum recharge is ₦100,000'),
    rechargeType: z.enum(['AIRTIME', 'DATA']).default('AIRTIME'),
    bundleId: z.string().optional(),
    paymentMethod: z.enum(['CARD', 'USSD', 'BANK_TRANSFER', 'WALLET']).default('CARD'),
    callbackUrl: z.string().url().optional()
  })
};

export const payPostpaidBillSchema = {
  body: z.object({
    msisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits'),
    amount: z.number().positive('Payment amount must be greater than 0'),
    paymentMethod: z.enum(['CARD', 'USSD', 'BANK_TRANSFER', 'WALLET']).default('CARD'),
    invoiceNumber: z.string().optional(),
    callbackUrl: z.string().url().optional()
  })
};

export const paymentWebhookSchema = {
  body: z.object({
    event: z.string(),
    reference: z.string(),
    status: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional()
  })
};

export type InitiateRechargeDto = z.infer<typeof initiateRechargeSchema.body>;
export type PayPostpaidBillDto = z.infer<typeof payPostpaidBillSchema.body>;
export type PaymentWebhookDto = z.infer<typeof paymentWebhookSchema.body>;

