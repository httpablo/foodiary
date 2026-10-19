import { Goal } from '@application/entities/Goal';
import { Profile } from '@application/entities/Profile';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { GoalRepository } from '@infra/database/postgres/repositories/GoalRepository';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightGoalUnitOfWork } from '@infra/database/postgres/uow/WeightGoalUnitOfWork';
import { Injectable } from '@kernel/decorators/Injectable';
import { GetWeightGoalUseCase } from './GetWeightGoalUseCase';

@Injectable([ProfileRepository, GoalRepository, WeightGoalUnitOfWork, GetWeightGoalUseCase])
export class EndWeightGoalUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly goalRepository: GoalRepository,
    private readonly weightGoalUow: WeightGoalUnitOfWork,
    private readonly getWeightGoalUseCase: GetWeightGoalUseCase,
  ) {}

  async execute({
    accountId,
    timezoneOffsetMinutes = 0,
  }: EndWeightGoalUseCase.Input): Promise<GetWeightGoalUseCase.Output> {
    const [profile, goal] = await Promise.all([
      this.profileRepository.findByAccountId(accountId),
      this.goalRepository.findByAccountId(accountId),
    ]);

    if (!profile || !goal) {
      throw new ResourceNotFound('Profile or goal not found.');
    }

    // Manual daily goals are never overwritten; calculated ones return to maintenance.
    const dailyGoal = goal.source === Goal.Source.CALCULATED
      ? new Goal({
        accountId,
        ...GoalCalculator.calculate(new Profile({ ...profile, goal: Profile.Goal.MAINTAIN })),
        calculatedForWeight: Number(profile.weight),
      })
      : undefined;

    await this.weightGoalUow.end({ accountId, dailyGoal });

    return this.getWeightGoalUseCase.execute({ accountId, timezoneOffsetMinutes });
  }
}

export namespace EndWeightGoalUseCase {
  export type Input = {
    accountId: string;
    timezoneOffsetMinutes?: number;
  };
}
