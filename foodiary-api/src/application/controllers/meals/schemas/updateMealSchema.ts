import { z } from 'zod';

const nutrient = z.number().finite().min(0).max(10000);

export const mealFoodSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.string().trim().min(1).max(80),
  proteins: nutrient,
  carbohydrates: nutrient,
  fats: nutrient,
});

export const updateMealSchema = z.object({
  name: z.string().trim().min(1).max(120),
  foods: z.array(mealFoodSchema).min(1).max(50),
});

export type UpdateMealBody = z.infer<typeof updateMealSchema>;
