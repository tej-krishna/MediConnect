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

const baseApplicationFields = {
  organizationName: z.string().trim().min(2).max(160),
  registrationNumber: z.string().trim().min(3).max(60),
  issuingAuthority: z.string().trim().min(2).max(160),
  contactPhone: z.string().trim().min(6).max(20),
  contactEmail: z.string().trim().toLowerCase().email(),
  address: addressSchema,
  location: locationSchema.optional(),
  consultationFee: z.coerce.number().min(0).max(1_000_000).optional(),
  operatingHoursNote: z.string().trim().max(200).optional(),
};

/**
 * Each provider type collects a different, small set of extra fields relevant to it (a doctor's
 * specialization vs. a hospital's bed count vs. an NGO's registration type) — stored together as
 * one `typeDetails` object rather than as a pile of top-level fields that are only ever set for
 * one type. The discriminated union means each branch only accepts (and requires) the shape that
 * actually applies to its providerType; this is also what drives the OpenAPI spec generation.
 */
export const createApplicationSchema = z.discriminatedUnion('providerType', [
  z.object({
    providerType: z.literal('doctor'),
    ...baseApplicationFields,
    typeDetails: z.object({
      specialization: z.string().trim().min(2).max(100),
      qualification: z.string().trim().min(2).max(150),
      yearsOfExperience: z.coerce.number().int().min(0).max(70),
    }),
  }),
  z.object({
    providerType: z.literal('hospital'),
    ...baseApplicationFields,
    typeDetails: z.object({
      bedCount: z.coerce.number().int().min(1).max(10_000),
      hospitalType: z.enum(['general', 'multi_specialty', 'specialty']),
      emergencyServicesAvailable: z.coerce.boolean(),
    }),
  }),
  z.object({
    providerType: z.literal('clinic'),
    ...baseApplicationFields,
    typeDetails: z.object({
      specialties: z.string().trim().min(2).max(200),
      clinicType: z.enum(['general', 'specialty']),
    }),
  }),
  z.object({
    providerType: z.literal('pharmacy'),
    ...baseApplicationFields,
    typeDetails: z.object({
      has24x7Service: z.coerce.boolean(),
      gstin: z.string().trim().max(20).optional(),
    }),
  }),
  z.object({
    providerType: z.literal('diagnostic_lab'),
    ...baseApplicationFields,
    typeDetails: z.object({
      nablAccreditationNumber: z.string().trim().max(60).optional(),
      homeCollectionAvailable: z.coerce.boolean(),
    }),
  }),
  z.object({
    providerType: z.literal('ambulance_provider'),
    ...baseApplicationFields,
    typeDetails: z.object({
      vehicleCount: z.coerce.number().int().min(1).max(1_000),
      vehicleType: z.enum(['basic_life_support', 'advanced_life_support']),
    }),
  }),
  z.object({
    providerType: z.literal('equipment_provider'),
    ...baseApplicationFields,
    typeDetails: z.object({
      equipmentCategories: z.string().trim().min(2).max(200),
      serviceType: z.enum(['rental', 'sale', 'both']),
    }),
  }),
  z.object({
    providerType: z.literal('mobile_van_operator'),
    ...baseApplicationFields,
    typeDetails: z.object({
      vanCount: z.coerce.number().int().min(1).max(500),
      coverageAreas: z.string().trim().min(2).max(300),
    }),
  }),
  z.object({
    providerType: z.literal('ngo_coordinator'),
    ...baseApplicationFields,
    typeDetails: z.object({
      ngoRegistrationType: z.enum(['trust', 'society', 'section8']),
      focusAreas: z.string().trim().min(2).max(300),
    }),
  }),
  z.object({
    providerType: z.literal('insurance_provider'),
    ...baseApplicationFields,
    typeDetails: z.object({
      irdaiLicenseNumber: z.string().trim().min(2).max(60),
      insuranceTypesOffered: z.string().trim().min(2).max(300),
    }),
  }),
]);

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
