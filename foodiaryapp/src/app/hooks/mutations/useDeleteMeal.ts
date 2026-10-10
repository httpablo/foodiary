import { queryClient } from '@app/lib/queryClient';
import { MealsService } from '@app/services/MealsService';
import { useMutation } from '@tanstack/react-query';

export function useDeleteMeal(mealId: string) {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => MealsService.deleteMeal(mealId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['meal', mealId] });
      await queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
  return { deleteMeal: mutateAsync, isLoading: isPending };
}
