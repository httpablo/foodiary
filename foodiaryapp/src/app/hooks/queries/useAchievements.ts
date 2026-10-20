import { queryKeys } from '@app/lib/queryKeys';
import { AchievementsService } from '@app/services/AchievementsService';
import { useQuery } from '@tanstack/react-query';

export function useAchievements() {
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.achievements(timezoneOffsetMinutes),
    staleTime: 60_000,
    queryFn: () => AchievementsService.list(timezoneOffsetMinutes),
  });

  return { achievements: data ?? [], isLoading, isError, refetch };
}
