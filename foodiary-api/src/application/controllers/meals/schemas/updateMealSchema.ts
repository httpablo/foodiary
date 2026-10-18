import { foodInputSchema, mealNameSchema } from '@application/shared/foodSchema';
import { z } from 'zod';

export const mealFoodSchema = foodInputSchema;

export const updateMealSchema = z.object({
  name: mealNameSchema,
  foods: z.array(foodInputSchema).min(1).max(50),
});

export type UpdateMealBody = z.infer<typeof updateMealSchema>;
