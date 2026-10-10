import { queryClient } from '@app/lib/queryClient';
import { MealsService } from '@app/services/MealsService';
import { useMutation } from '@tanstack/react-query';

export function useRepeatMeal(sourceMealId: string) {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: MealsService.UpdateMealPayload) => MealsService.repeatMeal(sourceMealId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
  return { repeatMeal: mutateAsync, isLoading: isPending };
}
