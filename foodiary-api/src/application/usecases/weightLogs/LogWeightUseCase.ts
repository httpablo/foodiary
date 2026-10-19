import { Goal } from '@application/entities/Goal';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { BadRequest } from '@application/errors/http/BadRequest';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { GoalRepository } from '@infra/database/postgres/repositories/GoalRepository';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightLogEntry, WeightLogRepository } from '@infra/database/postgres/repositories/WeightLogRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([WeightLogRepository, ProfileRepository, GoalRepository])
export class LogWeightUseCase {
  constructor(
    private readonly weightLogRepository: WeightLogRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly goalRepository: GoalRepository,
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

    const safeOffset = Number.isFinite(timezoneOffsetMinutes)
      ? Math.min(Math.max(Math.trunc(timezoneOffsetMinutes), -840), 840)
      : 0;
    const localToday = new Date(Date.now() - safeOffset * 60_000).toISOString().slice(0, 10);
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

    const [profile, goal] = await Promise.all([
      this.profileRepository.findByAccountId(accountId),
      this.goalRepository.findByAccountId(accountId),
    ]);

    if (!profile || !goal) {
      throw new ResourceNotFound('Profile or goal not found.');
    }

    const suggestedGoal = GoalCalculator.calculate(profile);

    if (applySuggestedGoal) {
      await this.goalRepository.save(new Goal({
        accountId,
        ...suggestedGoal,
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
  };
}
