import { z } from 'zod';
import { PROVIDER_TYPES } from './provider.types';

export const addressSchema = z.object({
  line1: z.string().trim().min(3).max(160),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(3).max(20),
  country: z.string().trim().min(2).max(60).default('India'),
});

export const locationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const createApplicationSchema = z.object({
  providerType: z.enum(PROVIDER_TYPES),
  organizationName: z.string().trim().min(2).max(160),
  registrationNumber: z.string().trim().min(3).max(60),
  issuingAuthority: z.string().trim().min(2).max(160),
  contactPhone: z.string().trim().min(6).max(20),
  contactEmail: z.string().trim().toLowerCase().email(),
  address: addressSchema,
  location: locationSchema.optional(),
  consultationFee: z.coerce.number().min(0).max(1_000_000).optional(),
  operatingHoursNote: z.string().trim().max(200).optional(),
});

export const updateListingInfoSchema = z.object({
  location: locationSchema.optional(),
  consultationFee: z.coerce.number().min(0).max(1_000_000).optional(),
  operatingHoursNote: z.string().trim().max(200).optional(),
});

export const searchProvidersQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(200).default(25),
  city: z.string().trim().min(1).max(80).optional(),
  providerType: z.enum(PROVIDER_TYPES).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const documentMetaSchema = z.object({
  documentType: z.string().trim().min(2).max(60),
});

export const reportSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const transitionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start_review') }),
  z.object({ action: z.literal('approve'), expiresAt: z.coerce.date().optional() }),
  z.object({ action: z.literal('reject'), reason: z.string().trim().min(5).max(500) }),
  z.object({ action: z.literal('suspend'), reason: z.string().trim().min(5).max(500) }),
  z.object({ action: z.literal('reinstate') }),
  z.object({ action: z.literal('mark_expired') }),
]);

export const setAvailabilitySchema = z.object({
  isCurrentlyAvailable: z.coerce.boolean(),
});

export const listApplicationsQuerySchema = z.object({
  status: z.string().optional(),
  providerType: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type UpdateListingInfoInput = z.infer<typeof updateListingInfoSchema>;
export type SearchProvidersQuery = z.infer<typeof searchProvidersQuerySchema>;
