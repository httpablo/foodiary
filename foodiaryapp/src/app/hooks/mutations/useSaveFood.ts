import { queryClient } from '@app/lib/queryClient';
import { SavedFoodsService } from '@app/services/SavedFoodsService';
import { SavedFood } from '@app/types/SavedFood';
import { useMutation } from '@tanstack/react-query';

export function useSaveFood() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (food: Omit<SavedFood, 'id'>) => SavedFoodsService.save(food),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savedFoods'] }),
  });
  return { saveFood: mutateAsync, isSavingFood: isPending };
}
