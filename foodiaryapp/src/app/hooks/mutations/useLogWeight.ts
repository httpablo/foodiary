import { queryClient } from '@app/lib/queryClient';
import { invalidateWeightQueries } from '@app/lib/queryKeys';
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
    onSuccess: () => invalidateWeightQueries(queryClient),
  });

  return {
    logWeight: mutateAsync,
    isLoggingWeight: isPending,
  };
}
