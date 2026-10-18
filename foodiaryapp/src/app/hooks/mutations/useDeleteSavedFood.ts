import { queryClient } from '@app/lib/queryClient';
import { queryKeys } from '@app/lib/queryKeys';
import { SavedFoodsService } from '@app/services/SavedFoodsService';
import { useMutation } from '@tanstack/react-query';

export function useDeleteSavedFood() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (id: string) => SavedFoodsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.savedFoods() }),
  });
  return { deleteSavedFood: mutateAsync, isDeletingFood: isPending };
}
