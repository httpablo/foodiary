import { queryClient } from '@app/lib/queryClient';
import { queryKeys } from '@app/lib/queryKeys';
import { ProfileService } from '@app/services/ProfileService';
import { useMutation } from '@tanstack/react-query';

export function useUpdateProfilePhoto() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (uri: string) => ProfileService.updateProfilePhoto(uri),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.account() }),
  });

  return { updateProfilePhoto: mutateAsync, isPhotoUploading: isPending };
}
