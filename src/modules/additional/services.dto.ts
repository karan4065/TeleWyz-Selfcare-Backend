import { z } from 'zod';

export const redeemLoyaltySchema = {
  body: z.object({
    points: z.number().int().min(50, 'Minimum 50 loyalty points required for redemption'),
    rewardType: z.enum(['AIRTIME', 'DATA_BUNDLE'])
  })
};

export const createSupportTicketSchema = {
  body: z.object({
    category: z.enum(['BILLING', 'NETWORK', 'SIM', 'VAS', 'GENERAL']),
    subject: z.string().min(5).max(100),
    description: z.string().min(10).max(1000),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
  })
};

export const storeLocatorQuerySchema = {
  query: z.object({
    city: z.string().optional()
  })
};

export const coverageQuerySchema = {
  query: z.object({
    state: z.string().optional(),
    city: z.string().optional()
  })
};

export type RedeemLoyaltyDto = z.infer<typeof redeemLoyaltySchema.body>;
export type CreateSupportTicketDto = z.infer<typeof createSupportTicketSchema.body>;
export type StoreLocatorQuery = z.infer<typeof storeLocatorQuerySchema.query>;
export type CoverageQuery = z.infer<typeof coverageQuerySchema.query>;

