import { Goal } from '@application/entities/Goal';
import { WeightGoal } from '@application/entities/WeightGoal';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { WeightGoalCalculator } from '@application/services/WeightGoalCalculator';
import { localDateFromOffset } from '@application/shared/localDate';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightGoalUnitOfWork } from '@infra/database/postgres/uow/WeightGoalUnitOfWork';
import { Injectable } from '@kernel/decorators/Injectable';
import { GetWeightGoalUseCase } from './GetWeightGoalUseCase';

@Injectable([ProfileRepository, WeightGoalUnitOfWork, GetWeightGoalUseCase])
export class SetWeightGoalUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly weightGoalUow: WeightGoalUnitOfWork,
    private readonly getWeightGoalUseCase: GetWeightGoalUseCase,
  ) {}

  async execute({
    accountId,
    targetWeight,
    paceKgPerWeek,
    applyToDailyGoals = true,
    timezoneOffsetMinutes = 0,
  }: SetWeightGoalUseCase.Input): Promise<GetWeightGoalUseCase.Output> {
    const profile = await this.profileRepository.findByAccountId(accountId);

    if (!profile) {
      throw new ResourceNotFound('Profile not found.');
    }

    const currentWeight = Number(profile.weight);

    WeightGoalCalculator.assertValidTarget({
      currentWeight,
      targetWeight,
      heightCm: Number(profile.height),
    });

    const direction = WeightGoalCalculator.direction(currentWeight, targetWeight);
    WeightGoalCalculator.assertValidPace(direction, currentWeight, paceKgPerWeek);

    const roundedPace = Number(paceKgPerWeek.toFixed(2));
    const weightGoal = new WeightGoal({
      accountId,
      startWeight: currentWeight,
      targetWeight: Number(targetWeight.toFixed(2)),
      startDate: localDateFromOffset(timezoneOffsetMinutes),
      paceKgPerWeek: roundedPace,
    });

    const dailyGoal = applyToDailyGoals
      ? new Goal({
        accountId,
        ...GoalCalculator.calculate(profile, { direction, paceKgPerWeek: roundedPace }),
        calculatedForWeight: currentWeight,
      })
      : undefined;

    await this.weightGoalUow.start({ accountId, weightGoal, dailyGoal });

    return this.getWeightGoalUseCase.execute({ accountId, timezoneOffsetMinutes });
  }
}

export namespace SetWeightGoalUseCase {
  export type Input = {
    accountId: string;
    targetWeight: number;
    paceKgPerWeek: number;
    applyToDailyGoals?: boolean;
    timezoneOffsetMinutes?: number;
  };
}
