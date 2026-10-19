import { queryKeys } from '@app/lib/queryKeys';
import { WeightGoalService } from '@app/services/WeightGoalService';
import { useQuery } from '@tanstack/react-query';

// Pass `undefined` while the target weight input is invalid to keep the query disabled.
export function useWeightGoalPreview(targetWeight: number | undefined) {
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: queryKeys.weightGoalPreview(targetWeight),
    enabled: targetWeight !== undefined,
    staleTime: 60_000,
    retry: false,
    queryFn: () => WeightGoalService.preview(targetWeight!),
  });

  return {
    preview: data,
    isLoading: targetWeight !== undefined && isLoading,
    isFetching,
    isError,
    error,
  };
}
