import { Meal } from '@application/entities/Meal';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { MealsAIGateway } from '@infra/ai/gateways/MealsAIGateway';
import { LocalMealQueueRepository } from '@infra/database/postgres/repositories/LocalMealQueueRepository';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([MealRepository, MealsAIGateway, LocalMealQueueRepository])
export class ProcessMealUseCase {
  constructor(
    private readonly mealRepository: MealRepository,
    private readonly mealsAIGateway: MealsAIGateway,
    private readonly queue: LocalMealQueueRepository,
  ) {}

  async execute({
    accountId,
    mealId,
  }: ProcessMealUseCase.Input): Promise<ProcessMealUseCase.Output> {
    const meal = await this.mealRepository.findById({ accountId, mealId });

    if (!meal) {
      throw new ResourceNotFound(`Meal "${mealId}" not found.`);
    }

    if (meal.status === Meal.Status.SUCCESS) {
      return;
    }

    const claimed = await this.queue.claimById(accountId, mealId);
    if (!claimed) {
      throw new Error(`Meal "${mealId}" is not ready for processing.`);
    }

    await this.processClaimed(claimed);
  }

  async processClaimed(meal: Meal): Promise<void> {
    try {
      const rawResult = await this.mealsAIGateway.processMeal(meal);
      const result = MealsAIGateway.validateAndNormalizeResult(meal.id, rawResult);
      await this.queue.completeSuccess(meal, result);
    } catch (error) {
      await this.queue.completeFailure(meal);
      throw error;
    }
  }
}

export namespace ProcessMealUseCase {
  export type Input = {
    accountId: string;
    mealId: string;
  };

  export type Output = void;
}
