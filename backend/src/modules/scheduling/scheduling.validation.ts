import { z } from 'zod';

export const createSlotSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    capacity: z.coerce.number().int().min(1).max(200).default(1),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  })
  .refine((data) => data.startTime.getTime() > Date.now(), {
    message: 'startTime must be in the future',
    path: ['startTime'],
  });

export const inviteStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const homeVisitAddressSchema = z.object({
  line1: z.string().trim().min(3).max(160),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(3).max(20),
});

export const requestConsultationSchema = z
  .object({
    doctorId: z.string().min(1),
    visitType: z.enum(['online', 'home_visit']),
    homeVisitAddress: homeVisitAddressSchema.optional(),
    preferredDateTime: z.coerce.date(),
  })
  .refine((data) => data.visitType !== 'home_visit' || data.homeVisitAddress, {
    message: 'homeVisitAddress is required for a home visit',
    path: ['homeVisitAddress'],
  })
  .refine((data) => data.preferredDateTime.getTime() > Date.now(), {
    message: 'preferredDateTime must be in the future',
    path: ['preferredDateTime'],
  });

export const consultationTransitionSchema = z.union([
  z.object({ action: z.literal('confirm'), confirmedDateTime: z.coerce.date() }),
  z.object({ action: z.literal('complete') }),
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('report_no_show') }),
]);

export const checkInSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export type CreateSlotInput = z.infer<typeof createSlotSchema>;
export type RequestConsultationInput = z.infer<typeof requestConsultationSchema>;
export type ConsultationTransitionInput = z.infer<typeof consultationTransitionSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
