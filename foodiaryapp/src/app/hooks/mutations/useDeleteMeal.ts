import { queryClient } from '@app/lib/queryClient';
import { invalidateMealQueries, queryKeys } from '@app/lib/queryKeys';
import { MealsService } from '@app/services/MealsService';
import { useMutation } from '@tanstack/react-query';

export function useDeleteMeal(mealId: string) {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => MealsService.deleteMeal(mealId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: queryKeys.meal(mealId) });
      await invalidateMealQueries(queryClient);
    },
  });
  return { deleteMeal: mutateAsync, isLoading: isPending };
}
