import { z } from 'zod';
import { updateMealSchema } from './updateMealSchema';

export const createManualMealSchema = updateMealSchema.extend({
  date: z.string().date(),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
});

export type CreateManualMealBody = z.infer<typeof createManualMealSchema>;
