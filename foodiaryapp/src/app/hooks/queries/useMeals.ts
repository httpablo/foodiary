import { MealsService } from '@app/services/MealsService';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export function useMeals(date: Date) {
  const formattedDate = formatDateToAPI(date);
  const timezoneOffsetMinutes = date.getTimezoneOffset();

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    staleTime: Infinity,
    queryKey: ['meals', formattedDate, timezoneOffsetMinutes],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { meals } = await MealsService.getMealsByDate(formattedDate, timezoneOffsetMinutes);
      return meals;
    },
  });

  return {
    meals: data ?? [],
    isInitialLoading: isLoading,
    isLoading: isFetching,
    isError,
    reloadMeals: refetch,
  };
}
