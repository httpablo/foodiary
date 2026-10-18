import { Meal } from '@application/entities/Meal';
import { normalizeFood } from '@application/shared/foodSchema';
import { SavedFoodRepository } from '@infra/database/postgres/repositories/SavedFoodRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([SavedFoodRepository])
export class SaveFoodUseCase {
  constructor(private readonly repository: SavedFoodRepository) {}

  async execute({ accountId, food }: SaveFoodUseCase.Input): Promise<{ id: string }> {
    const normalized = normalizeFood(food);
    const id = await this.repository.save(accountId, normalized);
    return { id };
  }
}

export namespace SaveFoodUseCase {
  export type Input = {
    accountId: string;
    food: Pick<Meal.Food, 'name' | 'quantity' | 'proteins' | 'carbohydrates' | 'fats'>;
  };
}
