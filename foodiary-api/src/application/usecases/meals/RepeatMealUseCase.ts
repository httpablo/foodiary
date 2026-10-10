import { Meal } from '@application/entities/Meal';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { BadRequest } from '@application/errors/http/BadRequest';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([MealRepository])
export class RepeatMealUseCase {
  constructor(private readonly mealRepository: MealRepository) {}

  async execute({ accountId, sourceMealId, name, foods }: RepeatMealUseCase.Input): Promise<{ mealId: string }> {
    const source = await this.mealRepository.findById({ accountId, mealId: sourceMealId });
    if (!source) {
      throw new ResourceNotFound('Meal not found.');
    }
    if (source.status !== Meal.Status.SUCCESS) {
      throw new BadRequest('Only completed meals can be repeated.');
    }

    const repeated = new Meal({
      accountId,
      status: Meal.Status.SUCCESS,
      inputType: Meal.InputType.MANUAL,
      inputFileKey: null,
      name,
      icon: source.icon,
      foods: foods.map(food => ({
        ...food,
        calories: Math.round(food.proteins * 4 + food.carbohydrates * 4 + food.fats * 9),
      })),
    });
    await this.mealRepository.create(repeated);
    return { mealId: repeated.id };
  }
}

export namespace RepeatMealUseCase {
  export type Input = {
    accountId: string;
    sourceMealId: string;
    name: string;
    foods: Pick<Meal.Food, 'name' | 'quantity' | 'proteins' | 'carbohydrates' | 'fats'>[];
  };
}
