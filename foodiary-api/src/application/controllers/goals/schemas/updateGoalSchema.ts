import z from 'zod';

export const updateGoalSchema = z.object({
  calories: z.number().finite().min(0).max(50000),
  proteins: z.number().finite().min(0).max(5000),
  carbohydrates: z.number().finite().min(0).max(10000),
  fats: z.number().finite().min(0).max(5000),
});

export type UpdateGoalBody = z.infer<typeof updateGoalSchema>;
