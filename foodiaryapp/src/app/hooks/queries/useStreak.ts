import { queryKeys } from '@app/lib/queryKeys';
import { MealsService } from '@app/services/MealsService';
import { useQuery } from '@tanstack/react-query';

export function useStreak() {
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.streak(timezoneOffsetMinutes),
    staleTime: 60_000,
    queryFn: () => MealsService.getStreak(timezoneOffsetMinutes),
  });

  return { streak: data, isLoading, isError };
}
