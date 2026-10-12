import { z } from 'zod';
import { PROVIDER_TYPES } from './provider.types';

export const addressSchema = z.object({
  line1: z.string().trim().min(3).max(160),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(3).max(20),
  country: z.string().trim().min(2).max(60).default('India'),
});

export const createApplicationSchema = z.object({
  providerType: z.enum(PROVIDER_TYPES),
  organizationName: z.string().trim().min(2).max(160),
  registrationNumber: z.string().trim().min(3).max(60),
  issuingAuthority: z.string().trim().min(2).max(160),
  contactPhone: z.string().trim().min(6).max(20),
  contactEmail: z.string().trim().toLowerCase().email(),
  address: addressSchema,
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

export const listApplicationsQuerySchema = z.object({
  status: z.string().optional(),
  providerType: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
