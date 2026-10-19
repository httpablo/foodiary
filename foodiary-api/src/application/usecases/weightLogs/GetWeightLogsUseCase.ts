import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { GoalRepository } from '@infra/database/postgres/repositories/GoalRepository';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightLogEntry, WeightLogRepository } from '@infra/database/postgres/repositories/WeightLogRepository';
import { WeightGoalRepository } from '@infra/database/postgres/repositories/WeightGoalRepository';
import { WeightGoal } from '@application/entities/WeightGoal';
import { Goal } from '@application/entities/Goal';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([WeightLogRepository, ProfileRepository, GoalRepository, WeightGoalRepository])
export class GetWeightLogsUseCase {
  constructor(
    private readonly weightLogRepository: WeightLogRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly goalRepository: GoalRepository,
    private readonly weightGoalRepository: WeightGoalRepository,
  ) {}

  async execute({
    accountId,
    limit = 30,
  }: GetWeightLogsUseCase.Input): Promise<GetWeightLogsUseCase.Output> {
    const [logs, profile, goal, initialWeight, currentWeightGoal] = await Promise.all([
      this.weightLogRepository.list(accountId, limit),
      this.profileRepository.findByAccountId(accountId),
      this.goalRepository.findByAccountId(accountId),
      this.weightLogRepository.getStartWeight(accountId),
      this.weightGoalRepository.findCurrent(accountId),
    ]);

    if (!profile || !goal) {
      throw new ResourceNotFound('Profile or goal not found.');
    }

    const currentWeight = Number(profile.weight);
    const startWeight = currentWeightGoal?.startWeight ?? initialWeight ?? currentWeight;
    const weightChange = Number((currentWeight - startWeight).toFixed(2));
    const activeWeightGoal = currentWeightGoal?.status === WeightGoal.Status.ACTIVE ? currentWeightGoal : null;
    const suggestedGoal = GoalCalculator.calculate(profile, activeWeightGoal);
    const shouldSuggestAdjustment = goal.source === Goal.Source.CALCULATED
      && goal.calculatedForWeight !== null
      && Math.abs(currentWeight - goal.calculatedForWeight) >= 1
      && (
        suggestedGoal.calories !== goal.calories
        || suggestedGoal.proteins !== goal.proteins
        || suggestedGoal.carbohydrates !== goal.carbohydrates
        || suggestedGoal.fats !== goal.fats
      );

    return {
      logs,
      currentWeight,
      startWeight,
      weightChange,
      currentGoal: {
        calories: goal.calories,
        proteins: goal.proteins,
        carbohydrates: goal.carbohydrates,
        fats: goal.fats,
      },
      suggestedGoal,
      goalSource: goal.source,
      shouldSuggestAdjustment,
    };
  }
}

export namespace GetWeightLogsUseCase {
  export type Input = {
    accountId: string;
    limit?: number;
  };

  export type GoalSummary = {
    calories: number;
    proteins: number;
    carbohydrates: number;
    fats: number;
  };

  export type Output = {
    logs: WeightLogEntry[];
    currentWeight: number;
    startWeight: number;
    weightChange: number;
    currentGoal: GoalSummary;
    suggestedGoal: GoalSummary;
    goalSource: Goal.Source;
    shouldSuggestAdjustment: boolean;
  };
}
