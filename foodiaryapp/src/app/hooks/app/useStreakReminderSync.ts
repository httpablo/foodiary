import { useReminderSettings } from '@app/hooks/queries/useReminderSettings';
import { useStreak } from '@app/hooks/queries/useStreak';
import { StreakReminder } from '@app/lib/StreakReminder';
import { useEffect } from 'react';

// Reschedules the reminder whenever the streak or the reminder settings change.
export function useStreakReminderSync() {
  const { streak } = useStreak();
  const { reminderSettings } = useReminderSettings();

  useEffect(() => {
    if (!streak || !reminderSettings || !StreakReminder.isSupported) {
      return;
    }
    StreakReminder.sync(reminderSettings, streak).catch(() => {});
  }, [streak, reminderSettings]);
}
