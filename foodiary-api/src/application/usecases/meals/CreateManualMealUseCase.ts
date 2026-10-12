import { Meal } from '@application/entities/Meal';
import { calculateFoodCalories } from '@application/entities/calculateFoodCalories';
import { BadRequest } from '@application/errors/http/BadRequest';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([MealRepository])
export class CreateManualMealUseCase {
  constructor(private readonly mealRepository: MealRepository) {}

  async execute({ accountId, name, foods, date, timezoneOffsetMinutes }: CreateManualMealUseCase.Input): Promise<{ mealId: string }> {
    const now = new Date();
    const localToday = new Date(now.getTime() - timezoneOffsetMinutes * 60_000).toISOString().slice(0, 10);
    if (date > localToday) {
      throw new BadRequest('Meals cannot be registered for a future date.');
    }

    const createdAt = date === localToday
      ? now
      : new Date(Date.parse(`${date}T12:00:00.000Z`) + timezoneOffsetMinutes * 60_000);
    const meal = new Meal({
      accountId,
      createdAt,
      status: Meal.Status.SUCCESS,
      inputType: Meal.InputType.MANUAL,
      inputFileKey: null,
      name,
      icon: '🍽️',
      foods: foods.map(food => ({
        ...food,
        calories: calculateFoodCalories(food),
      })),
    });
    await this.mealRepository.create(meal);
    return { mealId: meal.id };
  }
}

export namespace CreateManualMealUseCase {
  export type Input = {
    accountId: string;
    name: string;
    foods: Pick<Meal.Food, 'name' | 'quantity' | 'proteins' | 'carbohydrates' | 'fats'>[];
    date: string;
    timezoneOffsetMinutes: number;
  };
}
