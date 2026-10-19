import { queryClient } from '@app/lib/queryClient';
import { queryKeys } from '@app/lib/queryKeys';
import { WeightLogsService } from '@app/services/WeightLogsService';
import { useMutation } from '@tanstack/react-query';

export function useLogWeight() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: WeightLogsService.LogWeightPayload) => (
      WeightLogsService.logWeight({
        ...payload,
        timezoneOffsetMinutes: payload.timezoneOffsetMinutes ?? new Date().getTimezoneOffset(),
      })
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weightLogs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.account() });
    },
  });

  return {
    logWeight: mutateAsync,
    isLoggingWeight: isPending,
  };
}
