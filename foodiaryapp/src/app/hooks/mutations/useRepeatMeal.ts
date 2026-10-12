import { queryClient } from '@app/lib/queryClient';
import { MealsService } from '@app/services/MealsService';
import { useMutation } from '@tanstack/react-query';

export function useRepeatMeal(sourceMealId?: string) {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: MealsService.UpdateMealPayload) => {
      if (!sourceMealId) {
        throw new Error('sourceMealId is required to repeat a meal.');
      }
      return MealsService.repeatMeal(sourceMealId, payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['meals'] }),
        queryClient.invalidateQueries({ queryKey: ['weeklySummary'] }),
      ]);
    },
  });
  return { repeatMeal: mutateAsync, isLoading: isPending };
}
