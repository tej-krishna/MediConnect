import { z } from 'zod';

export const initiateRefundSchema = z.object({
  amount: z.coerce.number().min(0.01).max(1_000_000),
});

export const settleTransactionSchema = z.object({
  outcome: z.enum(['completed', 'rejected']),
  notes: z.string().trim().max(500).optional(),
});
