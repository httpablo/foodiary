import { WeightGoalOverview, WeightGoalPreview } from '@app/types/WeightGoal';
import { Service } from './Service';

export class WeightGoalService extends Service {
  static async get(): Promise<WeightGoalOverview> {
    const { data } = await this.client.get<WeightGoalOverview>('/weight-goal');

    return data;
  }

  static async preview(targetWeight: number): Promise<WeightGoalPreview> {
    const { data } = await this.client.get<WeightGoalPreview>('/weight-goal/preview', {
      params: { targetWeight },
    });

    return data;
  }

  static async set(payload: WeightGoalService.SetPayload): Promise<WeightGoalOverview> {
    const { data } = await this.client.put<WeightGoalOverview>('/weight-goal', payload);

    return data;
  }

  static async end(): Promise<WeightGoalOverview> {
    const { data } = await this.client.delete<WeightGoalOverview>('/weight-goal');

    return data;
  }
}

export namespace WeightGoalService {
  export type SetPayload = {
    targetWeight: number;
    paceKgPerWeek: number;
    applyToDailyGoals?: boolean;
    timezoneOffsetMinutes?: number;
  };
}
