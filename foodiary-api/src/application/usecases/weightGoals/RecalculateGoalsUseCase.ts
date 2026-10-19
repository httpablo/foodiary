import { Goal } from '@application/entities/Goal';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { GoalRepository } from '@infra/database/postgres/repositories/GoalRepository';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightGoalRepository } from '@infra/database/postgres/repositories/WeightGoalRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([ProfileRepository, GoalRepository, WeightGoalRepository])
export class RecalculateGoalsUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly goalRepository: GoalRepository,
    private readonly weightGoalRepository: WeightGoalRepository,
  ) {}

  async execute({ accountId }: RecalculateGoalsUseCase.Input): Promise<RecalculateGoalsUseCase.Output> {
    const [profile, weightGoal] = await Promise.all([
      this.profileRepository.findByAccountId(accountId),
      this.weightGoalRepository.findActive(accountId),
    ]);

    if (!profile) {
      throw new ResourceNotFound('Profile not found.');
    }

    const dailyGoal = GoalCalculator.calculate(profile, weightGoal);

    await this.goalRepository.save(new Goal({
      accountId,
      ...dailyGoal,
      source: Goal.Source.CALCULATED,
      calculatedForWeight: Number(profile.weight),
    }));

    return { dailyGoal };
  }
}

export namespace RecalculateGoalsUseCase {
  export type Input = {
    accountId: string;
  };

  export type Output = {
    dailyGoal: GoalCalculator.CalculateGoalResult;
  };
}
