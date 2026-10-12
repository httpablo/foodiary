import { queryClient } from '@app/lib/queryClient';
import { MealsService } from '@app/services/MealsService';
import { useMutation } from '@tanstack/react-query';

export function useCreateManualMeal() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: MealsService.CreateManualMealPayload) => MealsService.createManualMeal(payload),
    onSuccess: async (_, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['meals', payload.date, payload.timezoneOffsetMinutes],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({ queryKey: ['weeklySummary'] }),
      ]);
    },
  });
  return { createManualMeal: mutateAsync, isLoading: isPending };
}
