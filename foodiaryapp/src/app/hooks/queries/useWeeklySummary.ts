import { MealsService } from '@app/services/MealsService';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { useQuery } from '@tanstack/react-query';

export function useWeeklySummary(startDate: Date) {
  const date = formatDateToAPI(startDate);
  const timezoneOffsetMinutes = startDate.getTimezoneOffset();
  const { data, isLoading, isRefetching, refetch, isError } = useQuery({
    queryKey: ['weeklySummary', date, timezoneOffsetMinutes],
    staleTime: Infinity,
    queryFn: () => MealsService.getWeeklySummary(date, timezoneOffsetMinutes),
  });

  return { summary: data, isLoading, isRefetching, isError, refetch };
}
