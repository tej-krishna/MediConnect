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

export type CreateSlotInput = z.infer<typeof createSlotSchema>;
