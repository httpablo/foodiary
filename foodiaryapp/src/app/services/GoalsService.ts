import { Service } from './Service';

export class GoalsService extends Service {
  static async updateGoals(payload: GoalsService.UpdateGoalsPayload): Promise<void> {
    await this.client.put('/goals', payload);
  }

  static async recalculate(): Promise<GoalsService.RecalculateResponse> {
    const { data } = await this.client.post<GoalsService.RecalculateResponse>('/goals/recalculate');

    return data;
  }
}

export namespace GoalsService {
  export type UpdateGoalsPayload = {
    calories: number;
    proteins: number;
    carbohydrates: number;
    fats: number;
  };

  export type RecalculateResponse = {
    dailyGoal: UpdateGoalsPayload;
  };
}
