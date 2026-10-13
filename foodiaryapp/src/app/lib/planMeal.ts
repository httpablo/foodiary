import { summarizeFoods } from '@app/lib/summarizeFoods';
import type { Food } from '@app/types/Meal';
import type { SavedFood } from '@app/types/SavedFood';

export type Portion = 0.5 | 1 | 2;
export type PlannedFood = { food: SavedFood; portion: Portion };

const round = (value: number) => Math.round(value * 100) / 100;

export function buildPlannedFoods(items: PlannedFood[]): Food[] {
  return items.map(({ food, portion }) => {
    const prefix = portion === 0.5 ? '½ × ' : '2 × ';
    const quantity = portion === 1
      ? food.quantity
      : prefix.length + food.quantity.length <= 80
        ? `${prefix}${food.quantity}`
        : `${prefix}porção salva`;
    const proteins = round(food.proteins * portion);
    const carbohydrates = round(food.carbohydrates * portion);
    const fats = round(food.fats * portion);

    return {
      name: food.name,
      quantity,
      proteins,
      carbohydrates,
      fats,
      calories: Math.round(proteins * 4 + carbohydrates * 4 + fats * 9),
    };
  });
}

export function summarizePlannedMeal(items: PlannedFood[]) {
  return summarizeFoods(buildPlannedFoods(items));
}
