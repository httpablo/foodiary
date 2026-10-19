import { queryKeys } from '@app/lib/queryKeys';
import { WeightGoalService } from '@app/services/WeightGoalService';
import { useQuery } from '@tanstack/react-query';

export function useWeightGoal() {
  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    queryKey: queryKeys.weightGoal(),
    staleTime: 60_000,
    queryFn: () => WeightGoalService.get(),
  });

  return {
    weightGoalOverview: data,
    weightGoal: data?.weightGoal ?? null,
    isLoading,
    isRefetching,
    isError,
    refetch,
  };
}
