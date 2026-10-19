import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { WeightGoalCalculator } from '@application/services/WeightGoalCalculator';
import { localDateFromOffset } from '@application/shared/localDate';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightGoalRepository } from '@infra/database/postgres/repositories/WeightGoalRepository';
import { WeightLogRepository } from '@infra/database/postgres/repositories/WeightLogRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([WeightGoalRepository, ProfileRepository, WeightLogRepository])
export class GetWeightGoalUseCase {
  constructor(
    private readonly weightGoalRepository: WeightGoalRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly weightLogRepository: WeightLogRepository,
  ) {}

  async execute({
    accountId,
    timezoneOffsetMinutes = 0,
  }: GetWeightGoalUseCase.Input): Promise<GetWeightGoalUseCase.Output> {
    const [profile, weightGoal, logs] = await Promise.all([
      this.profileRepository.findByAccountId(accountId),
      this.weightGoalRepository.findCurrent(accountId),
      this.weightLogRepository.list(accountId, 30),
    ]);

    if (!profile) {
      throw new ResourceNotFound('Profile not found.');
    }

    const currentWeight = Number(profile.weight);
    const today = localDateFromOffset(timezoneOffsetMinutes);

    return {
      currentWeight,
      trendWeight: WeightGoalCalculator.trendWeight(logs),
      healthyRange: WeightGoalCalculator.healthyRange(profile.height),
      weightGoal: weightGoal
        ? WeightGoalCalculator.view(weightGoal, currentWeight, logs, today)
        : null,
    };
  }
}

export namespace GetWeightGoalUseCase {
  export type Input = {
    accountId: string;
    timezoneOffsetMinutes?: number;
  };

  export type Output = {
    currentWeight: number;
    trendWeight: number | null;
    healthyRange: WeightGoalCalculator.HealthyRange;
    weightGoal: WeightGoalCalculator.WeightGoalView | null;
  };
}
