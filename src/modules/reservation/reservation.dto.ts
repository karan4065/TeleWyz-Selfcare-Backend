import { z } from 'zod';
import { phoneRegex } from '../auth/auth.dto';

export const searchNumbersSchema = {
  query: z.object({
    pattern: z.string().optional(),
    category: z.enum(['NORMAL', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
    limit: z.coerce.number().min(1).max(100).default(20)
  })
};

export const reserveNumberSchema = {
  body: z.object({
    msisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits'),
    ttlMinutes: z.number().min(5).max(60).default(15)
  })
};

export type SearchNumbersQuery = z.infer<typeof searchNumbersSchema.query>;
export type ReserveNumberDto = z.infer<typeof reserveNumberSchema.body>;

