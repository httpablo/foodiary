import { queryClient } from '@app/lib/queryClient';
import { MealsService } from '@app/services/MealsService';
import { useMutation } from '@tanstack/react-query';

export function useUpdateMeal(mealId: string) {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: MealsService.UpdateMealPayload) => MealsService.updateMeal(mealId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['meal', mealId] }),
        queryClient.invalidateQueries({ queryKey: ['meals'] }),
      ]);
    },
  });
  return { updateMeal: mutateAsync, isLoading: isPending };
}
