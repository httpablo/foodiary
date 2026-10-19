import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { WeightGoalCalculator } from '@application/services/WeightGoalCalculator';
import { addDays, localDateFromOffset } from '@application/shared/localDate';
import { GoalRepository } from '@infra/database/postgres/repositories/GoalRepository';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightGoal } from '@application/entities/WeightGoal';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([ProfileRepository, GoalRepository])
export class PreviewWeightGoalUseCase {
  private static longTimelineInWeeks = 52;

  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly goalRepository: GoalRepository,
  ) {}

  async execute({
    accountId,
    targetWeight,
    timezoneOffsetMinutes = 0,
  }: PreviewWeightGoalUseCase.Input): Promise<PreviewWeightGoalUseCase.Output> {
    const [profile, goal] = await Promise.all([
      this.profileRepository.findByAccountId(accountId),
      this.goalRepository.findByAccountId(accountId),
    ]);

    if (!profile || !goal) {
      throw new ResourceNotFound('Profile or goal not found.');
    }

    const currentWeight = Number(profile.weight);
    const heightCm = Number(profile.height);

    WeightGoalCalculator.assertValidTarget({ currentWeight, targetWeight, heightCm });

    const direction = WeightGoalCalculator.direction(currentWeight, targetWeight);
    const healthyRange = WeightGoalCalculator.healthyRange(heightCm);
    const distance = Math.abs(targetWeight - currentWeight);
    const today = localDateFromOffset(timezoneOffsetMinutes);

    const options = WeightGoalCalculator.paceOptions(direction, currentWeight).map(({ key, paceKgPerWeek }) => {
      const weeks = WeightGoalCalculator.weeksToReach(distance, paceKgPerWeek);

      return {
        key,
        paceKgPerWeek,
        weeks,
        estimatedDate: addDays(today, weeks * 7),
        dailyGoal: GoalCalculator.calculate(profile, { direction, paceKgPerWeek }),
      };
    });

    const warnings: string[] = [];

    if (WeightGoalCalculator.isAboveHealthyRange(targetWeight, heightCm)) {
      warnings.push(
        `Seu peso alvo está acima da faixa saudável para a sua altura (${healthyRange.min}–${healthyRange.max} kg).`,
      );
    }

    const recommended = options.find(option => option.key === WeightGoal.PaceKey.RECOMMENDED);

    if (recommended && recommended.weeks > PreviewWeightGoalUseCase.longTimelineInWeeks) {
      warnings.push(
        `No ritmo recomendado, essa meta levaria cerca de ${recommended.weeks} semanas. Considere uma meta intermediária.`,
      );
    }

    return {
      currentWeight,
      targetWeight,
      direction,
      healthyRange,
      targetBmi: Math.round(WeightGoalCalculator.bmi(targetWeight, heightCm) * 10) / 10,
      warnings,
      currentDailyGoal: {
        calories: goal.calories,
        proteins: goal.proteins,
        carbohydrates: goal.carbohydrates,
        fats: goal.fats,
      },
      options,
    };
  }
}

export namespace PreviewWeightGoalUseCase {
  export type Input = {
    accountId: string;
    targetWeight: number;
    timezoneOffsetMinutes?: number;
  };

  export type DailyGoal = GoalCalculator.CalculateGoalResult;

  export type Output = {
    currentWeight: number;
    targetWeight: number;
    direction: WeightGoal.Direction;
    healthyRange: WeightGoalCalculator.HealthyRange;
    targetBmi: number;
    warnings: string[];
    currentDailyGoal: DailyGoal;
    options: {
      key: WeightGoal.PaceKey;
      paceKgPerWeek: number;
      weeks: number;
      estimatedDate: string;
      dailyGoal: DailyGoal;
    }[];
  };
}
