import { queryKeys } from '@app/lib/queryKeys';
import { MealsService } from '@app/services/MealsService';
import { useInfiniteQuery } from '@tanstack/react-query';

export function useMealHistory() {
  return useInfiniteQuery({
    queryKey: queryKeys.mealHistory(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => MealsService.getHistory(pageParam),
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
}
