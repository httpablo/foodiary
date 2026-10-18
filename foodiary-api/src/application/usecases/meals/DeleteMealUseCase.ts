import { Meal } from '@application/entities/Meal';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { BadRequest } from '@application/errors/http/BadRequest';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { LocalMealsFileStorageGateway } from '@infra/gateways/LocalMealsFileStorageGateway';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([MealRepository, LocalMealsFileStorageGateway])
export class DeleteMealUseCase {
  constructor(
    private readonly mealRepository: MealRepository,
    private readonly storage: LocalMealsFileStorageGateway,
  ) {}

  async execute({ accountId, mealId }: { accountId: string; mealId: string }): Promise<void> {
    const meal = await this.mealRepository.findById({ accountId, mealId });
    if (!meal) {
      throw new ResourceNotFound('Meal not found.');
    }
    if (meal.status === Meal.Status.QUEUED || meal.status === Meal.Status.PROCESSING) {
      throw new BadRequest('Meals that are queued or processing cannot be deleted.');
    }

    const deleted = await this.mealRepository.deleteDeletable({ accountId, mealId });
    if (!deleted) {
      throw new BadRequest('Meal is no longer available for deletion.');
    }
    if (!deleted.inputFileKey) {
      return;
    }
    try {
      await this.storage.remove(deleted.inputFileKey);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        // eslint-disable-next-line no-console
        console.error('Could not remove meal file:', error);
      }
    }
  }
}
