import { WeightGoalSummary, WeightLogEntry, WeightLogsSummary } from '@app/types/WeightLog';
import { Service } from './Service';

export class WeightLogsService extends Service {
  static async list(limit = 30): Promise<WeightLogsSummary> {
    const { data } = await this.client.get<WeightLogsSummary>('/weight-logs', {
      params: { limit },
    });

    return data;
  }

  static async logWeight(
    payload: WeightLogsService.LogWeightPayload,
  ): Promise<WeightLogsService.LogWeightResponse> {
    const { data } = await this.client.post<WeightLogsService.LogWeightResponse>('/weight-logs', payload);

    return data;
  }
}

export namespace WeightLogsService {
  export type LogWeightPayload = {
    weight: number;
    date?: string;
    timezoneOffsetMinutes?: number;
    applySuggestedGoal?: boolean;
  };

  export type LogWeightResponse = {
    entry: WeightLogEntry;
    currentWeight: number;
    currentGoal: WeightGoalSummary;
    suggestedGoal: WeightGoalSummary;
  };
}
