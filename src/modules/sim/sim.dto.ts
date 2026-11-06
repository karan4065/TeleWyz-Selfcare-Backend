import { z } from 'zod';
import { phoneRegex } from '../auth/auth.dto';

export const createSimOrderSchema = {
  body: z.object({
    msisdn: z.string().regex(phoneRegex, 'MSISDN must be 10 to 15 digits'),
    simType: z.enum(['PHYSICAL', 'ESIM']),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email(),
    deliveryAddress: z.string().optional()
  }).refine(data => {
    if (data.simType === 'PHYSICAL' && (!data.deliveryAddress || data.deliveryAddress.trim().length === 0)) {
      return false;
    }
    return true;
  }, {
    message: 'Delivery address is required for Physical SIM orders'
  })
};

export const submitKycSchema = {
  body: z.object({
    orderNumber: z.string().min(1, 'Order number is required'),
    nin: z.string().length(11, 'NIN must be exactly 11 digits'),
    livePhotoBase64: z.string().optional()
  })
};

export const activateSimSchema = {
  body: z.object({
    orderNumber: z.string().min(1, 'Order number is required')
  })
};

export const simReplacementSchema = {
  body: z.object({
    reason: z.enum(['LOST', 'DAMAGED', 'UPGRADE_TO_ESIM', 'STOLEN']),
    simType: z.enum(['PHYSICAL', 'ESIM']),
    deliveryAddress: z.string().optional()
  })
};

export type CreateSimOrderDto = z.infer<typeof createSimOrderSchema.body>;
export type SubmitKycDto = z.infer<typeof submitKycSchema.body>;
export type ActivateSimDto = z.infer<typeof activateSimSchema.body>;
export type SimReplacementDto = z.infer<typeof simReplacementSchema.body>;

