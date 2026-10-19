import { queryClient } from '@app/lib/queryClient';
import { invalidateWeightQueries } from '@app/lib/queryKeys';
import { WeightGoalService } from '@app/services/WeightGoalService';
import { useMutation } from '@tanstack/react-query';

export function useEndWeightGoal() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => WeightGoalService.end(),
    onSuccess: () => invalidateWeightQueries(queryClient),
  });

  return {
    endWeightGoal: mutateAsync,
    isEndingWeightGoal: isPending,
  };
}
