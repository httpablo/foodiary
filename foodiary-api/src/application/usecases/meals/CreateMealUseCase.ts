import { Meal } from '@application/entities/Meal';
import { BadRequest } from '@application/errors/http/BadRequest';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { LocalMealsFileStorageGateway } from '@infra/gateways/LocalMealsFileStorageGateway';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([MealRepository, LocalMealsFileStorageGateway])
export class CreateMealUseCase {
  constructor(
    private readonly mealRepository: MealRepository,
    private readonly mealsFileStorageGateway: LocalMealsFileStorageGateway,
  ) {}

  async execute({
    accountId,
    date,
    timezoneOffsetMinutes,
    file,
  }: CreateMealUseCase.Input): Promise<CreateMealUseCase.Output> {
    let createdAt: Date | undefined;

    if (date) {
      const offset = timezoneOffsetMinutes ?? 0;
      const now = new Date();
      const localToday = new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
      if (date > localToday) {
        throw new BadRequest('Meals cannot be registered for a future date.');
      }

      createdAt = date === localToday
        ? now
        : new Date(Date.parse(`${date}T12:00:00.000Z`) + offset * 60_000);
    }

    const inputFileKey = LocalMealsFileStorageGateway.generateInputFileKey({
      accountId,
      inputType: file.inputType,
      mimeType: file.mimeType,
    });

    const meal = new Meal({
      accountId,
      createdAt,
      inputType: file.inputType,
      status: Meal.Status.UPLOADING,
      inputFileKey,
    });

    await this.mealRepository.create(meal);
    const { uploadSignature } = this.mealsFileStorageGateway.createPOST({ mealId: meal.id });

    return {
      mealId: meal.id,
      uploadSignature,
    };
  }
}

export namespace CreateMealUseCase {
  export type Input = {
    accountId: string;
    date?: string;
    timezoneOffsetMinutes?: number;
    file: {
      inputType: Exclude<Meal.InputType, Meal.InputType.MANUAL>;
      size: number;
      mimeType?: string;
    };
  };

  export type Output = {
    mealId: string;
    uploadSignature: string;
  };
}
