import { BadRequest } from '@application/errors/http/BadRequest';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { Meal } from '@application/entities/Meal';
import { calculateFoodCalories } from '@application/entities/calculateFoodCalories';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([MealRepository])
export class UpdateMealUseCase {
  constructor(private readonly mealRepository: MealRepository) {}

  async execute({ accountId, mealId, name, foods }: UpdateMealUseCase.Input): Promise<void> {
    const meal = await this.mealRepository.findById({ accountId, mealId });
    if (!meal) {
      throw new ResourceNotFound('Meal not found.');
    }
    if (meal.status !== Meal.Status.SUCCESS) {
      throw new BadRequest('Only completed meals can be edited.');
    }

    const saved = await this.mealRepository.updateContents({
      accountId,
      mealId,
      name,
      foods: foods.map(food => ({
        ...food,
        calories: calculateFoodCalories(food),
      })),
    });
    if (!saved) {
      throw new BadRequest('Meal is no longer available for editing.');
    }
  }
}

export namespace UpdateMealUseCase {
  export type Input = {
    accountId: string;
    mealId: string;
    name: string;
    foods: Pick<Meal.Food, 'name' | 'quantity' | 'proteins' | 'carbohydrates' | 'fats'>[];
  };
}
