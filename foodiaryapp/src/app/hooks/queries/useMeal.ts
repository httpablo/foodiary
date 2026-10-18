import { queryKeys } from '@app/lib/queryKeys';
import { MealsService } from '@app/services/MealsService';
import { MealStatus } from '@app/types/Meal';
import { useQuery } from '@tanstack/react-query';

const processingStatuses = [
  MealStatus.UPLOADING,
  MealStatus.QUEUED,
  MealStatus.PROCESSING,
];

export function useMeal(mealId?: string) {
  const { data: meal, isFetching, isError, error, refetch } = useQuery({
    queryKey: queryKeys.meal(mealId),
    staleTime: Infinity,
    enabled: !!mealId,
    queryFn: async () => {
      if (!mealId) {
        return;
      }

      const { meal } = await MealsService.getMealById(mealId);
      return meal;
    },
    refetchInterval: (query) => {
      if (query.state.status === 'error') {
        return false;
      }

      const mealStatus = query.state.data?.status;
      if (mealStatus && processingStatuses.includes(mealStatus)) {
        return 3_000;
      }

      return false;
    },
  });

  const isProcessing = !!(meal && processingStatuses.includes(meal.status));

  return {
    meal,
    isLoading: isFetching,
    isFetching,
    isProcessing,
    isError,
    error,
    refetch,
  };
}
