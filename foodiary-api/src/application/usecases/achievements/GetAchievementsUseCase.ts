import { Achievement } from '@application/entities/Achievement';
import { WeightGoal } from '@application/entities/WeightGoal';
import { AchievementEvaluator } from '@application/services/AchievementEvaluator';
import { StreakCalculator } from '@application/services/StreakCalculator';
import { WeightGoalCalculator } from '@application/services/WeightGoalCalculator';
import { localDateFromOffset } from '@application/shared/localDate';
import { AchievementRepository } from '@infra/database/postgres/repositories/AchievementRepository';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightGoalRepository } from '@infra/database/postgres/repositories/WeightGoalRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([AchievementRepository, MealRepository, ProfileRepository, WeightGoalRepository])
export class GetAchievementsUseCase {
  constructor(
    private readonly achievementRepository: AchievementRepository,
    private readonly mealRepository: MealRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly weightGoalRepository: WeightGoalRepository,
  ) {}

  // Evaluated on read: anything newly met is stored before the list is returned.
  async execute({ accountId, timezoneOffsetMinutes }: GetAchievementsUseCase.Input): Promise<GetAchievementsUseCase.Output> {
    const today = localDateFromOffset(timezoneOffsetMinutes);
    const [facts, loggedDays, profile, weightGoal, unlocked] = await Promise.all([
      this.achievementRepository.loadFacts(accountId),
      this.mealRepository.listLoggedDays(accountId, timezoneOffsetMinutes),
      this.profileRepository.findByAccountId(accountId),
      this.weightGoalRepository.findCurrent(accountId),
      this.achievementRepository.list(accountId),
    ]);

    const weightGoalPercent = weightGoal?.status === WeightGoal.Status.ACTIVE && profile
      ? WeightGoalCalculator.progress(weightGoal, Number(profile.weight), [], today).percent
      : null;
    const met = AchievementEvaluator.evaluate({
      ...facts,
      loggedDays,
      bestStreak: StreakCalculator.calculate(loggedDays, today).bestStreak,
      weightGoalPercent,
    });

    const known = new Set(unlocked.map(item => item.code));
    const newCodes = met.filter(code => !known.has(code));
    if (newCodes.length === 0) {
      return { achievements: unlocked };
    }

    await this.achievementRepository.unlock(accountId, newCodes);
    return { achievements: await this.achievementRepository.list(accountId) };
  }
}

export namespace GetAchievementsUseCase {
  export type Input = {
    accountId: string;
    timezoneOffsetMinutes: number;
  };

  export type Output = {
    achievements: Achievement.Unlocked[];
  };
}
