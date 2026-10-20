import { queryKeys } from '@app/lib/queryKeys';
import { StreakReminder } from '@app/lib/StreakReminder';
import { useQuery } from '@tanstack/react-query';

export function useReminderSettings() {
  const { data } = useQuery({
    queryKey: queryKeys.reminderSettings(),
    staleTime: Infinity,
    queryFn: () => StreakReminder.loadSettings(),
  });

  return { reminderSettings: data };
}
