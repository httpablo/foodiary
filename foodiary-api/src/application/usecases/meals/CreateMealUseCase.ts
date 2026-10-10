import { Meal } from '@application/entities/Meal';
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
    file,
  }: CreateMealUseCase.Input): Promise<CreateMealUseCase.Output> {
    const inputFileKey = LocalMealsFileStorageGateway.generateInputFileKey({
      accountId,
      inputType: file.inputType,
    });

    const meal = new Meal({
      accountId,
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
    file: {
      inputType: Exclude<Meal.InputType, Meal.InputType.MANUAL>;
      size: number;
    };
  };

  export type Output = {
    mealId: string;
    uploadSignature: string;
  };
}
