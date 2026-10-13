import { z } from 'zod';
import { OFFERING_TYPES } from './careOffering.model';

export const createCareOfferingSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(80),
  offeringType: z.enum(OFFERING_TYPES),
  price: z.coerce.number().min(0).max(1_000_000),
  availableQuantity: z.coerce.number().int().min(0).max(100_000).nullable().optional(),
});

export const updateCareOfferingSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  category: z.string().trim().min(2).max(80).optional(),
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  availableQuantity: z.coerce.number().int().min(0).max(100_000).nullable().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const searchCareOfferingsQuerySchema = z.object({
  query: z.string().trim().min(1).max(120).optional(),
  offeringType: z.enum(OFFERING_TYPES).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const createCareRequestSchema = z.object({
  offeringId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  preferredDate: z.coerce.date(),
  expectedReturnDate: z.coerce.date().optional(),
  deliveryAddress: z.object({
    line1: z.string().trim().min(3).max(160),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().min(3).max(20),
  }),
  notes: z.string().trim().max(500).optional(),
});

export const careRequestTransitionSchema = z.object({
  action: z.enum(['confirm', 'fulfill', 'mark_returned', 'mark_completed', 'cancel']),
});

export type CreateCareOfferingInput = z.infer<typeof createCareOfferingSchema>;
export type UpdateCareOfferingInput = z.infer<typeof updateCareOfferingSchema>;
export type SearchCareOfferingsQuery = z.infer<typeof searchCareOfferingsQuerySchema>;
export type CreateCareRequestInput = z.infer<typeof createCareRequestSchema>;
export type CareRequestTransitionInput = z.infer<typeof careRequestTransitionSchema>;
