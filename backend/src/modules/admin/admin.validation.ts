import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  role: z.string().optional(),
  status: z.enum(['active', 'locked', 'suspended']).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const setUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export const setCommissionRuleSchema = z.object({
  percentage: z.coerce.number().min(0).max(100),
});

export const listAuditLogQuerySchema = z.object({
  action: z.string().optional(),
  targetType: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;
export type SetCommissionRuleInput = z.infer<typeof setCommissionRuleSchema>;
