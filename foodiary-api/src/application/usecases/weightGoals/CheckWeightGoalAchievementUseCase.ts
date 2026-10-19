import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightGoalRepository } from '@infra/database/postgres/repositories/WeightGoalRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([ProfileRepository, WeightGoalRepository])
export class CheckWeightGoalAchievementUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly weightGoalRepository: WeightGoalRepository,
  ) {}

  // Returns true only when this call flipped the active goal to ACHIEVED.
  async execute({ accountId }: CheckWeightGoalAchievementUseCase.Input): Promise<boolean> {
    const profile = await this.profileRepository.findByAccountId(accountId);

    if (!profile) {
      return false;
    }

    return this.weightGoalRepository.markAchievedIfReached(accountId, Number(profile.weight));
  }
}

export namespace CheckWeightGoalAchievementUseCase {
  export type Input = {
    accountId: string;
  };
}
