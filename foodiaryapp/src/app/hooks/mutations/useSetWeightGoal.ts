import { queryClient } from '@app/lib/queryClient';
import { invalidateWeightQueries } from '@app/lib/queryKeys';
import { WeightGoalService } from '@app/services/WeightGoalService';
import { useMutation } from '@tanstack/react-query';

export function useSetWeightGoal() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: WeightGoalService.SetPayload) => (
      WeightGoalService.set({
        ...payload,
        timezoneOffsetMinutes: payload.timezoneOffsetMinutes ?? new Date().getTimezoneOffset(),
      })
    ),
    onSuccess: () => invalidateWeightQueries(queryClient),
  });

  return {
    setWeightGoal: mutateAsync,
    isSettingWeightGoal: isPending,
  };
}
