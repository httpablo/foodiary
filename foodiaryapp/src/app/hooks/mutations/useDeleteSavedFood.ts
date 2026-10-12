import { queryClient } from '@app/lib/queryClient';
import { SavedFoodsService } from '@app/services/SavedFoodsService';
import { useMutation } from '@tanstack/react-query';

export function useDeleteSavedFood() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (id: string) => SavedFoodsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savedFoods'] }),
  });
  return { deleteSavedFood: mutateAsync, isDeletingFood: isPending };
}
