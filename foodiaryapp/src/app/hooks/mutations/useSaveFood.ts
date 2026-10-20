import { queryClient } from '@app/lib/queryClient';
import { queryKeys } from '@app/lib/queryKeys';
import { SavedFoodsService } from '@app/services/SavedFoodsService';
import { SavedFood } from '@app/types/SavedFood';
import { useMutation } from '@tanstack/react-query';

export function useSaveFood() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (food: Omit<SavedFood, 'id'>) => SavedFoodsService.save(food),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.savedFoods() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements() }),
    ]),
  });
  return { saveFood: mutateAsync, isSavingFood: isPending };
}
