import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { GoalRepository } from '@infra/database/postgres/repositories/GoalRepository';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightLogEntry, WeightLogRepository } from '@infra/database/postgres/repositories/WeightLogRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([WeightLogRepository, ProfileRepository, GoalRepository])
export class GetWeightLogsUseCase {
  constructor(
    private readonly weightLogRepository: WeightLogRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly goalRepository: GoalRepository,
  ) {}

  async execute({
    accountId,
    limit = 30,
  }: GetWeightLogsUseCase.Input): Promise<GetWeightLogsUseCase.Output> {
    const [logs, profile, goal, initialWeight] = await Promise.all([
      this.weightLogRepository.list(accountId, limit),
      this.profileRepository.findByAccountId(accountId),
      this.goalRepository.findByAccountId(accountId),
      this.weightLogRepository.getStartWeight(accountId),
    ]);

    if (!profile || !goal) {
      throw new ResourceNotFound('Profile or goal not found.');
    }

    const currentWeight = Number(profile.weight);
    const startWeight = logs.length > 1
      ? Number(logs[logs.length - 1].weight)
      : (initialWeight ?? (logs.length > 0 ? Number(logs[0].weight) : currentWeight));
    const weightChange = Number((currentWeight - startWeight).toFixed(2));
    const suggestedGoal = GoalCalculator.calculate(profile);

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
  };
}
