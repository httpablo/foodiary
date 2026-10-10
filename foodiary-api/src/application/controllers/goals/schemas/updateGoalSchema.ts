import z from 'zod';

export const updateGoalSchema = z.object({
  calories: z.number().nonnegative(),
  proteins: z.number().nonnegative(),
  carbohydrates: z.number().nonnegative(),
  fats: z.number().nonnegative(),
});

export type UpdateGoalBody = z.infer<typeof updateGoalSchema>;
