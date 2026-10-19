import { queryKeys } from '@app/lib/queryKeys';
import { WeightLogsService } from '@app/services/WeightLogsService';
import { useQuery } from '@tanstack/react-query';

export function useWeightLogs(limit = 30) {
  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    queryKey: queryKeys.weightLogs(limit),
    staleTime: 60_000,
    queryFn: () => WeightLogsService.list(limit),
  });

  return {
    weightLogs: data,
    isLoading,
    isRefetching,
    isError,
    refetch,
  };
}
