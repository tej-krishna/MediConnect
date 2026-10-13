import { z } from 'zod';
import { ACCESS_SCOPES } from './caregiverAccess.model';
import { DOCUMENT_TYPES } from './medicalDocument.model';

export const updateProfileSchema = z.object({
  bloodType: z.string().trim().max(10).optional(),
  allergies: z.array(z.string().trim().min(1).max(160)).max(50).optional(),
  chronicConditions: z.array(z.string().trim().min(1).max(160)).max(50).optional(),
  currentMedications: z.array(z.string().trim().min(1).max(160)).max(50).optional(),
});

export const documentMetaSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  title: z.string().trim().min(2).max(160),
  visitDate: z.coerce.date().optional(),
});

export const createVisitSchema = z.object({
  visitDate: z.coerce.date(),
  reasonForVisit: z.string().trim().min(2).max(200),
  notes: z.string().trim().max(2000).optional(),
});

export const updateVisitSchema = z.object({
  visitDate: z.coerce.date().optional(),
  reasonForVisit: z.string().trim().min(2).max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const inviteCaregiverSchema = z.object({
  caregiverEmail: z.string().trim().toLowerCase().email(),
  scopes: z.array(z.enum(ACCESS_SCOPES)).min(1).max(ACCESS_SCOPES.length),
  expiresAt: z.coerce.date().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;
export type InviteCaregiverInput = z.infer<typeof inviteCaregiverSchema>;
