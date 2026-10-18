import { calculateFoodCalories } from '@application/entities/calculateFoodCalories';
import { Meal } from '@application/entities/Meal';
import { BadRequest } from '@application/errors/http/BadRequest';
import { z } from 'zod';

export const nutrientSchema = z.number().finite().min(0).max(10000);

export const mealNameSchema = z.string().trim().min(1).max(120);

export const foodInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.string().trim().min(1).max(80),
  proteins: nutrientSchema,
  carbohydrates: nutrientSchema,
  fats: nutrientSchema,
});

export type FoodInput = z.infer<typeof foodInputSchema>;

export function normalizeFood(
  food: Pick<Meal.Food, 'name' | 'quantity' | 'proteins' | 'carbohydrates' | 'fats'>,
): Meal.Food {
  const parsed = foodInputSchema.safeParse(food);
  if (!parsed.success) {
    throw new BadRequest('Invalid food item.');
  }

  return {
    ...parsed.data,
    calories: calculateFoodCalories(parsed.data),
  };
}

export function normalizeFoods(
  foods: Pick<Meal.Food, 'name' | 'quantity' | 'proteins' | 'carbohydrates' | 'fats'>[],
): Meal.Food[] {
  if (!Array.isArray(foods) || foods.length < 1 || foods.length > 50) {
    throw new BadRequest('Meal must contain between 1 and 50 food items.');
  }

  return foods.map(normalizeFood);
}
