import { queryClient } from '@app/lib/queryClient';
import { queryKeys } from '@app/lib/queryKeys';
import { StreakReminder } from '@app/lib/StreakReminder';
import { useMutation } from '@tanstack/react-query';

export function useUpdateReminderSettings() {
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (settings: StreakReminder.Settings) => {
      await StreakReminder.saveSettings(settings);
      return settings;
    },
    onSuccess: settings => queryClient.setQueryData(queryKeys.reminderSettings(), settings),
  });

  return { updateReminderSettings: mutateAsync, isUpdatingReminder: isPending };
}
