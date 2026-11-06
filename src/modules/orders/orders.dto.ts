import { z } from 'zod';
import { phoneRegex } from '../auth/auth.dto';

export const createOrderSchema = {
  body: z.object({
    msisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits'),
    type: z.enum(['SIM_PURCHASE', 'RECHARGE', 'BILL_PAYMENT', 'MNP', 'PLAN_SUBSCRIPTION']),
    totalAmount: z.number().min(0).default(0),
    currency: z.string().default('NGN'),
    metadata: z.record(z.any()).optional()
  })
};

export const listOrdersQuerySchema = {
  query: z.object({
    type: z.enum(['SIM_PURCHASE', 'RECHARGE', 'BILL_PAYMENT', 'MNP', 'PLAN_SUBSCRIPTION']).optional(),
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    page: z.coerce.number().min(1).default(1)
  })
};

export const updateOrderStatusSchema = {
  body: z.object({
    status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
    reason: z.string().optional()
  })
};

export type CreateOrderDto = z.infer<typeof createOrderSchema.body>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema.query>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema.body>;

