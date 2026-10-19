import { queryClient } from '@app/lib/queryClient';
import { invalidateWeightQueries } from '@app/lib/queryKeys';
import { GoalsService } from '@app/services/GoalsService';
import { useMutation } from '@tanstack/react-query';

export function useRecalculateGoals() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => GoalsService.recalculate(),
    onSuccess: () => invalidateWeightQueries(queryClient),
  });

  return {
    recalculateGoals: mutateAsync,
    isRecalculatingGoals: isPending,
  };
}
