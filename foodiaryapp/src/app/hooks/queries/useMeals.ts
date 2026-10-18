import { queryKeys } from '@app/lib/queryKeys';
import { MealsService } from '@app/services/MealsService';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export function useMeals(date: Date) {
  const formattedDate = formatDateToAPI(date);
  const timezoneOffsetMinutes = date.getTimezoneOffset();

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    staleTime: Infinity,
    queryKey: queryKeys.meals(formattedDate, timezoneOffsetMinutes),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { meals } = await MealsService.getMealsByDate(formattedDate, timezoneOffsetMinutes);
      return meals;
    },
  });

  return {
    meals: isError ? [] : data ?? [],
    isInitialLoading: isLoading,
    isLoading: isFetching,
    isError,
    error,
    reloadMeals: refetch,
  };
}
