import { z } from 'zod';

export const getStreakSchema = z.object({
  timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840).default(0),
});
