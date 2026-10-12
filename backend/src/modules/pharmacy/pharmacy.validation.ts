import { z } from 'zod';
import { ORDER_STATUSES } from './order.model';

export const createMedicineItemSchema = z.object({
  name: z.string().trim().min(2).max(160),
  genericName: z.string().trim().min(2).max(160),
  activeIngredient: z.string().trim().min(2).max(160),
  strength: z.string().trim().min(1).max(40),
  dosageForm: z.string().trim().min(2).max(40),
  manufacturer: z.string().trim().max(160).optional(),
  unitPrice: z.coerce.number().min(0).max(1_000_000),
  stockQuantity: z.coerce.number().int().min(0).max(1_000_000),
  requiresPrescription: z.coerce.boolean().default(false),
});

export const updateMedicineItemSchema = z.object({
  unitPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  stockQuantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
  requiresPrescription: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const searchMedicinesQuerySchema = z.object({
  query: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().min(1).max(80).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const createOrderSchema = z.object({
  pharmacyId: z.string().min(1),
  items: z
    .array(
      z.object({
        medicineItemId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(50),
  deliveryAddress: z.object({
    line1: z.string().trim().min(3).max(160),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().min(3).max(20),
  }),
});

export const orderTransitionSchema = z.object({
  action: z.enum(['confirm', 'start_preparing', 'out_for_delivery', 'deliver', 'cancel']),
});
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type CreateMedicineItemInput = z.infer<typeof createMedicineItemSchema>;
export type UpdateMedicineItemInput = z.infer<typeof updateMedicineItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderTransitionInput = z.infer<typeof orderTransitionSchema>;
