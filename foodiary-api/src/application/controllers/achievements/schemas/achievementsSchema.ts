import { Achievement } from '@application/entities/Achievement';
import { z } from 'zod';

export const getAchievementsSchema = z.object({
  timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840).default(0),
});

export const acknowledgeAchievementsSchema = z.object({
  codes: z.array(z.nativeEnum(Achievement.Code)).min(1).max(Object.keys(Achievement.Code).length),
});

export type AcknowledgeAchievementsBody = z.infer<typeof acknowledgeAchievementsSchema>;
