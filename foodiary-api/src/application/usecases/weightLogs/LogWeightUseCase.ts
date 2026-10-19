import { Goal } from '@application/entities/Goal';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { BadRequest } from '@application/errors/http/BadRequest';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { GoalRepository } from '@infra/database/postgres/repositories/GoalRepository';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightLogEntry, WeightLogRepository } from '@infra/database/postgres/repositories/WeightLogRepository';
import { Injectable } from '@kernel/decorators/Injectable';
import { localDateFromOffset } from '@application/shared/localDate';
import { WeightGoalRepository } from '@infra/database/postgres/repositories/WeightGoalRepository';
import { CheckWeightGoalAchievementUseCase } from '../weightGoals/CheckWeightGoalAchievementUseCase';

@Injectable([
  WeightLogRepository,
  ProfileRepository,
  GoalRepository,
  WeightGoalRepository,
  CheckWeightGoalAchievementUseCase,
])
export class LogWeightUseCase {
  constructor(
    private readonly weightLogRepository: WeightLogRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly goalRepository: GoalRepository,
    private readonly weightGoalRepository: WeightGoalRepository,
    private readonly checkWeightGoalAchievementUseCase: CheckWeightGoalAchievementUseCase,
  ) {}

  async execute({
    accountId,
    weight,
    date,
    timezoneOffsetMinutes = 0,
    applySuggestedGoal = false,
  }: LogWeightUseCase.Input): Promise<LogWeightUseCase.Output> {
    if (!Number.isFinite(weight) || weight <= 0 || weight > 700) {
      throw new BadRequest('Weight must be a finite positive number up to 700 kg.');
    }

    const localToday = localDateFromOffset(timezoneOffsetMinutes);
    const targetDate = date ?? localToday;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(new Date(`${targetDate}T00:00:00.000Z`).getTime())) {
      throw new BadRequest('Invalid date format.');
    }

    if (targetDate > localToday) {
      throw new BadRequest('Weight cannot be logged for a future date.');
    }

    const roundedWeight = Number(weight.toFixed(2));
    const entry = await this.weightLogRepository.upsert({
      accountId,
      weight: roundedWeight,
      date: targetDate,
    });

    const weightGoalAchieved = await this.checkWeightGoalAchievementUseCase.execute({ accountId });

    const [profile, goal, weightGoal] = await Promise.all([
      this.profileRepository.findByAccountId(accountId),
      this.goalRepository.findByAccountId(accountId),
      this.weightGoalRepository.findActive(accountId),
    ]);

    if (!profile || !goal) {
      throw new ResourceNotFound('Profile or goal not found.');
    }

    const suggestedGoal = GoalCalculator.calculate(profile, weightGoal);

    if (applySuggestedGoal) {
      await this.goalRepository.save(new Goal({
        accountId,
        ...suggestedGoal,
        source: Goal.Source.CALCULATED,
        calculatedForWeight: Number(profile.weight),
      }));
    }

    return {
      entry,
      currentWeight: Number(profile.weight),
      currentGoal: applySuggestedGoal
        ? suggestedGoal
        : {
          calories: goal.calories,
          proteins: goal.proteins,
          carbohydrates: goal.carbohydrates,
          fats: goal.fats,
        },
      suggestedGoal,
      weightGoalAchieved,
    };
  }
}

export namespace LogWeightUseCase {
  export type Input = {
    accountId: string;
    weight: number;
    date?: string;
    timezoneOffsetMinutes?: number;
    applySuggestedGoal?: boolean;
  };

  export type GoalSummary = {
    calories: number;
    proteins: number;
    carbohydrates: number;
    fats: number;
  };

  export type Output = {
    entry: WeightLogEntry;
    currentWeight: number;
    currentGoal: GoalSummary;
    suggestedGoal: GoalSummary;
    weightGoalAchieved: boolean;
  };
}
