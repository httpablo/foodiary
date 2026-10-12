import { Meal } from './Meal';

export function calculateFoodCalories(food: Pick<Meal.Food, 'proteins' | 'carbohydrates' | 'fats'>): number {
  return Math.round(food.proteins * 4 + food.carbohydrates * 4 + food.fats * 9);
}
