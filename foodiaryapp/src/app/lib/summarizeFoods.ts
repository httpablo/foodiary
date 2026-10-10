import type { Food } from '@app/types/Meal';

export function summarizeFoods(foods: Food[]) {
  const totals = foods.reduce((acc, food) => ({
    calories: acc.calories + Math.round(food.proteins * 4 + food.carbohydrates * 4 + food.fats * 9),
    proteins: acc.proteins + food.proteins,
    carbohydrates: acc.carbohydrates + food.carbohydrates,
    fats: acc.fats + food.fats,
  }), { calories: 0, proteins: 0, carbohydrates: 0, fats: 0 });

  return {
    calories: totals.calories,
    proteins: Math.round(totals.proteins * 100) / 100,
    carbohydrates: Math.round(totals.carbohydrates * 100) / 100,
    fats: Math.round(totals.fats * 100) / 100,
  };
}
