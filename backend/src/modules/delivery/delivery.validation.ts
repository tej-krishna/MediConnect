import { z } from 'zod';
import { VEHICLE_TYPES } from './deliveryPartner.model';

export const applyDeliveryPartnerSchema = z.object({
  contactPhone: z.string().trim().min(6).max(20),
  vehicleType: z.enum(VEHICLE_TYPES),
  serviceCity: z.string().trim().min(2).max(80),
});

export const reviewDeliveryPartnerSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal('suspend'), reason: z.string().trim().min(3).max(500) }),
]);

export const assignDeliveryPartnerSchema = z.object({
  deliveryPartnerUserId: z.string().min(1),
});

export type ApplyDeliveryPartnerInput = z.infer<typeof applyDeliveryPartnerSchema>;
export type ReviewDeliveryPartnerInput = z.infer<typeof reviewDeliveryPartnerSchema>;
export type AssignDeliveryPartnerInput = z.infer<typeof assignDeliveryPartnerSchema>;
