import { z } from 'zod';

const timezoneOffsetSchema = z.coerce.number().int().min(-840).max(840).optional();

export const setWeightGoalSchema = z.object({
  targetWeight: z.number().finite().min(30, '"targetWeight" must be at least 30 kg').max(700, '"targetWeight" must be at most 700 kg'),
  paceKgPerWeek: z.number().finite().positive('"paceKgPerWeek" must be greater than 0').max(10),
  applyToDailyGoals: z.boolean().optional(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
});

export type SetWeightGoalBody = z.infer<typeof setWeightGoalSchema>;

export const weightGoalQuerySchema = z.object({
  timezoneOffsetMinutes: timezoneOffsetSchema,
});

export const previewWeightGoalQuerySchema = z.object({
  targetWeight: z.coerce.number().finite().min(30, '"targetWeight" must be at least 30 kg').max(700, '"targetWeight" must be at most 700 kg'),
  timezoneOffsetMinutes: timezoneOffsetSchema,
});
