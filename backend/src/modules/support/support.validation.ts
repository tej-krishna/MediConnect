import { z } from 'zod';
import { TICKET_CATEGORIES, TICKET_STATUSES, RELATED_ENTITY_TYPES } from './supportTicket.model';

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  category: z.enum(TICKET_CATEGORIES),
  description: z.string().trim().min(10).max(2000),
  relatedEntityType: z.enum(RELATED_ENTITY_TYPES).optional(),
  relatedEntityId: z.string().min(1).optional(),
});

export const addMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const updateTicketStatusSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign_to_me') }),
  z.object({ action: z.literal('start_progress') }),
  z.object({ action: z.literal('resolve'), resolutionNote: z.string().trim().min(3).max(2000) }),
  z.object({ action: z.literal('close') }),
  z.object({ action: z.literal('reopen') }),
]);

export const listTicketsQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type AddMessageInput = z.infer<typeof addMessageSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
