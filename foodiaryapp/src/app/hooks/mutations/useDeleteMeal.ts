import { queryClient } from '@app/lib/queryClient';
import { MealsService } from '@app/services/MealsService';
import { useMutation } from '@tanstack/react-query';

export function useDeleteMeal(mealId: string) {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => MealsService.deleteMeal(mealId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['meal', mealId] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['meals'] }),
        queryClient.invalidateQueries({ queryKey: ['weeklySummary'] }),
        queryClient.invalidateQueries({ queryKey: ['mealHistory'] }),
      ]);
    },
  });
  return { deleteMeal: mutateAsync, isLoading: isPending };
}
