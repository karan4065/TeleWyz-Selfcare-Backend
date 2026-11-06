import { z } from 'zod';

export const listPlansQuerySchema = {
  query: z.object({
    type: z.enum(['PREPAID', 'POSTPAID']).optional(),
    category: z.enum(['VOICE_DATA', 'DATA_ONLY', 'UNLIMITED']).optional()
  })
};

export const listPackagesQuerySchema = {
  query: z.object({
    category: z.enum(['DATA_BOOSTER', 'VOICE_BOOSTER', 'ROAMING', 'INTERNATIONAL']).optional()
  })
};

export const subscribeSchema = {
  body: z.object({
    itemId: z.string().min(1, 'Plan or Bundle item ID is required'),
    itemType: z.enum(['PLAN', 'ADDON']).default('PLAN'),
    autoRenew: z.boolean().default(false)
  })
};

export const unsubscribeSchema = {
  body: z.object({
    subscriptionId: z.string().min(1, 'Subscription ID is required')
  })
};

export type SubscribeDto = z.infer<typeof subscribeSchema.body>;
export type UnsubscribeDto = z.infer<typeof unsubscribeSchema.body>;

