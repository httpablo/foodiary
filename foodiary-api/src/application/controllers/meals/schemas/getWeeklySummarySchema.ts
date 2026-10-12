import { z } from 'zod';

export const getWeeklySummarySchema = z.object({
  startDate: z.string().date().refine(value => (
    new Date(`${value}T00:00:00.000Z`).getUTCDay() === 1
  ), 'startDate must be a Monday').transform(value => new Date(`${value}T00:00:00.000Z`)),
  timezoneOffsetMinutes: z.coerce.number().int().min(-840).max(840).default(0),
});
