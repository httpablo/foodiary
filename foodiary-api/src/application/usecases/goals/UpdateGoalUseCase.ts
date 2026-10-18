import { Goal } from '@application/entities/Goal';
import { BadRequest } from '@application/errors/http/BadRequest';
import { GoalRepository } from '@infra/database/postgres/repositories/GoalRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([GoalRepository])
export class UpdateGoalUseCase {
  constructor(private readonly goalRepository: GoalRepository) {}

  async execute({
    accountId,
    calories,
    carbohydrates,
    fats,
    proteins,
  }: UpdateGoalUseCase.Input): Promise<UpdateGoalUseCase.Output> {
    if (
      !Number.isFinite(calories) || calories < 0 || calories > 50000
      || !Number.isFinite(proteins) || proteins < 0 || proteins > 5000
      || !Number.isFinite(carbohydrates) || carbohydrates < 0 || carbohydrates > 10000
      || !Number.isFinite(fats) || fats < 0 || fats > 5000
    ) {
      throw new BadRequest('Goal values must be finite numbers within valid bounds.');
    }

    await this.goalRepository.save(new Goal({
      accountId,
      calories,
      carbohydrates,
      proteins,
      fats,
    }));
  }
}

export namespace UpdateGoalUseCase {
  export type Input = {
    accountId: string;
    calories: number;
    proteins: number;
    carbohydrates: number;
    fats: number;
  };

  export type Output = void;
}
