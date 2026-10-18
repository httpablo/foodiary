import { queryClient } from '@app/lib/queryClient';
import { invalidateMealQueries, queryKeys } from '@app/lib/queryKeys';
import { MealsService } from '@app/services/MealsService';
import { useMutation } from '@tanstack/react-query';

export function useCreateManualMeal() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: MealsService.CreateManualMealPayload) => MealsService.createManualMeal(payload),
    onSuccess: async (mealId, payload) => {
      await Promise.all([
        invalidateMealQueries(queryClient, mealId),
        queryClient.invalidateQueries({
          queryKey: queryKeys.meals(payload.date, payload.timezoneOffsetMinutes),
          refetchType: 'all',
        }),
      ]);
    },
  });
  return { createManualMeal: mutateAsync, isLoading: isPending };
}
