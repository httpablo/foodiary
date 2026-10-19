import { queryClient } from '@app/lib/queryClient';
import { invalidateWeightQueries } from '@app/lib/queryKeys';
import { GoalsService } from '@app/services/GoalsService';
import { useMutation } from '@tanstack/react-query';

export function useUpdateGoals() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (payload: GoalsService.UpdateGoalsPayload) => {
      await GoalsService.updateGoals(payload);
    },
    onSuccess: () => invalidateWeightQueries(queryClient),
  });

  return {
    updateGoals: mutateAsync,
    isLoading: isPending,
  };
}
