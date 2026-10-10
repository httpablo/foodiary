import { queryClient } from '@app/lib/queryClient';
import { ProfileService } from '@app/services/ProfileService';
import { useMutation } from '@tanstack/react-query';

export function useUpdateProfilePhoto() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (uri: string) => ProfileService.updateProfilePhoto(uri),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account'] }),
  });

  return { updateProfilePhoto: mutateAsync, isPhotoUploading: isPending };
}
