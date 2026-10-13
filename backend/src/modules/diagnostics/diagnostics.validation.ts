import { z } from 'zod';

export const createTestSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(80),
  sampleType: z.string().trim().min(2).max(80),
  price: z.coerce.number().min(0).max(1_000_000),
  turnaroundHours: z.coerce.number().int().min(1).max(10_000),
  homeCollectionAvailable: z.coerce.boolean().default(false),
});

export const updateTestSchema = z.object({
  price: z.coerce.number().min(0).max(1_000_000).optional(),
  turnaroundHours: z.coerce.number().int().min(1).max(10_000).optional(),
  homeCollectionAvailable: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const searchTestsQuerySchema = z.object({
  query: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const createDiagnosticOrderSchema = z
  .object({
    labId: z.string().min(1),
    testIds: z.array(z.string().min(1)).min(1).max(20),
    collectionMethod: z.enum(['at_lab', 'home_collection']),
    homeAddress: z
      .object({
        line1: z.string().trim().min(3).max(160),
        city: z.string().trim().min(2).max(80),
        state: z.string().trim().min(2).max(80),
        postalCode: z.string().trim().min(3).max(20),
      })
      .optional(),
    preferredDateTime: z.coerce.date(),
  })
  .refine((data) => data.collectionMethod !== 'home_collection' || data.homeAddress, {
    message: 'homeAddress is required for home collection',
    path: ['homeAddress'],
  })
  .refine((data) => data.preferredDateTime.getTime() > Date.now(), {
    message: 'preferredDateTime must be in the future',
    path: ['preferredDateTime'],
  });

export const diagnosticOrderTransitionSchema = z.union([
  z.object({ action: z.literal('schedule'), confirmedDateTime: z.coerce.date(), assignedCollector: z.string().optional() }),
  z.object({ action: z.literal('mark_collected') }),
  z.object({ action: z.literal('start_processing') }),
  z.object({ action: z.literal('cancel') }),
]);

export const createHealthCampSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional(),
  locationDescription: z.string().trim().min(2).max(200),
  location: z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) }).optional(),
  scheduledDate: z.coerce.date(),
  startTime: z.string().trim().min(1).max(10),
  endTime: z.string().trim().min(1).max(10),
  servicesOffered: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  capacity: z.coerce.number().int().min(1).max(10_000),
});

export const searchCampsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(500).default(50),
  city: z.string().trim().min(1).max(80).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
export type CreateDiagnosticOrderInput = z.infer<typeof createDiagnosticOrderSchema>;
export type DiagnosticOrderTransitionInput = z.infer<typeof diagnosticOrderTransitionSchema>;
export type CreateHealthCampInput = z.infer<typeof createHealthCampSchema>;
export type SearchCampsQuery = z.infer<typeof searchCampsQuerySchema>;
