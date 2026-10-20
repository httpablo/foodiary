import type { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
  account: () => ['account'] as const,
  meals: (date?: string, timezoneOffsetMinutes?: number) => {
    if (date === undefined) {
      return ['meals'] as const;
    }
    return timezoneOffsetMinutes !== undefined
      ? (['meals', date, timezoneOffsetMinutes] as const)
      : (['meals', date] as const);
  },
  meal: (id?: string) => (id !== undefined ? (['meal', id] as const) : (['meal'] as const)),
  weeklySummary: (date?: string, timezoneOffsetMinutes?: number) => {
    if (date === undefined) {
      return ['weeklySummary'] as const;
    }
    return timezoneOffsetMinutes !== undefined
      ? (['weeklySummary', date, timezoneOffsetMinutes] as const)
      : (['weeklySummary', date] as const);
  },
  streak: (timezoneOffsetMinutes?: number) => (
    timezoneOffsetMinutes !== undefined
      ? (['streak', timezoneOffsetMinutes] as const)
      : (['streak'] as const)
  ),
  achievements: (timezoneOffsetMinutes?: number) => (
    timezoneOffsetMinutes !== undefined
      ? (['achievements', timezoneOffsetMinutes] as const)
      : (['achievements'] as const)
  ),
  reminderSettings: () => ['reminderSettings'] as const,
  mealHistory: (params?: unknown) => (
    params !== undefined ? (['mealHistory', params] as const) : (['mealHistory'] as const)
  ),
  savedFoods: (search?: string) => (
    search !== undefined ? (['savedFoods', search] as const) : (['savedFoods'] as const)
  ),
  weightLogs: (limit?: number) => (
    limit !== undefined ? (['weightLogs', limit] as const) : (['weightLogs'] as const)
  ),
  weightGoal: () => ['weightGoal'] as const,
  weightGoalPreview: (targetWeight?: number) => (
    targetWeight !== undefined
      ? (['weightGoal', 'preview', targetWeight] as const)
      : (['weightGoal', 'preview'] as const)
  ),
};

export async function invalidateWeightQueries(client: Pick<QueryClient, 'invalidateQueries'>) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.account() }),
    client.invalidateQueries({ queryKey: queryKeys.weightLogs() }),
    client.invalidateQueries({ queryKey: queryKeys.weightGoal() }),
    client.invalidateQueries({ queryKey: queryKeys.achievements() }),
  ]);
}

export async function invalidateMealQueries(
  client: Pick<QueryClient, 'invalidateQueries'>,
  mealId?: string,
) {
  await Promise.all([
    ...(mealId ? [client.invalidateQueries({ queryKey: queryKeys.meal(mealId) })] : []),
    client.invalidateQueries({ queryKey: queryKeys.meals(), refetchType: 'all' }),
    client.invalidateQueries({ queryKey: queryKeys.weeklySummary() }),
    client.invalidateQueries({ queryKey: queryKeys.streak() }),
    client.invalidateQueries({ queryKey: queryKeys.achievements() }),
    client.invalidateQueries({ queryKey: queryKeys.mealHistory() }),
  ]);
}
