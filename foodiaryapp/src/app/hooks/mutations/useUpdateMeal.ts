import { queryClient } from '@app/lib/queryClient';
import { invalidateMealQueries } from '@app/lib/queryKeys';
import { MealsService } from '@app/services/MealsService';
import { useMutation } from '@tanstack/react-query';

export function useUpdateMeal(mealId?: string) {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: MealsService.UpdateMealPayload) => {
      if (!mealId) {
        throw new Error('mealId is required to update a meal.');
      }
      return MealsService.updateMeal(mealId, payload);
    },
    onSuccess: async () => {
      await invalidateMealQueries(queryClient, mealId);
    },
  });
  return { updateMeal: mutateAsync, isLoading: isPending };
}
