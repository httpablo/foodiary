import { queryClient } from '@app/lib/queryClient';
import { invalidateWeightQueries } from '@app/lib/queryKeys';
import { ProfileService } from '@app/services/ProfileService';
import { useMutation } from '@tanstack/react-query';

export function useUpdateProfile() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (payload: ProfileService.UpdateProfilePayload) => {
      await ProfileService.updateProfile({
        ...payload,
        timezoneOffsetMinutes: payload.timezoneOffsetMinutes ?? new Date().getTimezoneOffset(),
      });
    },
    onSuccess: () => invalidateWeightQueries(queryClient),
  });

  return {
    updateProfile: mutateAsync,
    isLoading: isPending,
  };
}
