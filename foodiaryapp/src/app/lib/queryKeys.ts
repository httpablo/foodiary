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
  mealHistory: (params?: unknown) => (
    params !== undefined ? (['mealHistory', params] as const) : (['mealHistory'] as const)
  ),
  savedFoods: (search?: string) => (
    search !== undefined ? (['savedFoods', search] as const) : (['savedFoods'] as const)
  ),
  weightLogs: (limit?: number) => (
    limit !== undefined ? (['weightLogs', limit] as const) : (['weightLogs'] as const)
  ),
};

export async function invalidateMealQueries(
  client: Pick<QueryClient, 'invalidateQueries'>,
  mealId?: string,
) {
  await Promise.all([
    ...(mealId ? [client.invalidateQueries({ queryKey: queryKeys.meal(mealId) })] : []),
    client.invalidateQueries({ queryKey: queryKeys.meals(), refetchType: 'all' }),
    client.invalidateQueries({ queryKey: queryKeys.weeklySummary() }),
    client.invalidateQueries({ queryKey: queryKeys.mealHistory() }),
  ]);
}
