import { z } from 'zod';

export const createGuideSchema = z.object({
  title: z.string().trim().min(2).max(160),
  redFlagSymptoms: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
  guidance: z.string().trim().min(2).max(2000),
  displayOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const updateGuideSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  redFlagSymptoms: z.array(z.string().trim().min(1).max(200)).min(1).max(20).optional(),
  guidance: z.string().trim().min(2).max(2000).optional(),
  displayOrder: z.coerce.number().int().min(0).max(1000).optional(),
  isActive: z.coerce.boolean().optional(),
  clinicallyReviewed: z.coerce.boolean().optional(),
});

export type CreateGuideInput = z.infer<typeof createGuideSchema>;
export type UpdateGuideInput = z.infer<typeof updateGuideSchema>;
