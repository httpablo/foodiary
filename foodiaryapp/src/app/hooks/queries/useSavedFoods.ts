import { queryKeys } from '@app/lib/queryKeys';
import { SavedFoodsService } from '@app/services/SavedFoodsService';
import { useQuery } from '@tanstack/react-query';

export function useSavedFoods() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.savedFoods(),
    staleTime: Infinity,
    queryFn: () => SavedFoodsService.list(),
  });
  return { savedFoods: data ?? [], isLoading, isError, refetch };
}
