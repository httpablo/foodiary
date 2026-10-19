import { z } from 'zod';

export const logWeightSchema = z.object({
  weight: z.number().finite().min(1, '"weight" must be at least 1 kg').max(700, '"weight" must be at most 700 kg'),
  date: z.string().date().optional(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
  applySuggestedGoal: z.boolean().optional(),
});

export type LogWeightBody = z.infer<typeof logWeightSchema>;

export const listWeightLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(365).default(30),
});
