import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Streak } from '@app/types/Streak';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Local, per-device reminder: one notification per upcoming day, skipping days already logged.
export class StreakReminder {
  static isSupported = true;

  static hours = [19, 20, 21, 22] as const;

  private static KEY = 'foodiary.streak-reminder';

  private static CHANNEL_ID = 'reminders';

  private static ID_PREFIX = 'streak-reminder-';

  private static DAYS_AHEAD = 7;

  private static defaults: StreakReminder.Settings = { enabled: false, hour: 20 };

  static async loadSettings(): Promise<StreakReminder.Settings> {
    try {
      const value = await AsyncStorage.getItem(this.KEY);
      const parsed: unknown = value ? JSON.parse(value) : null;
      if (!parsed || typeof parsed !== 'object') {
        return this.defaults;
      }
      const { enabled, hour } = parsed as Record<string, unknown>;
      return {
        enabled: enabled === true,
        hour: this.hours.find(item => item === hour) ?? this.defaults.hour,
      };
    } catch {
      return this.defaults;
    }
  }

  static async saveSettings(settings: StreakReminder.Settings): Promise<void> {
    await AsyncStorage.setItem(this.KEY, JSON.stringify(settings));
  }

  static async requestPermission(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      return true;
    }
    if (!current.canAskAgain) {
      return false;
    }
    return (await Notifications.requestPermissionsAsync()).granted;
  }

  static async sync(settings: StreakReminder.Settings, streak: Streak): Promise<void> {
    await this.cancel();
    if (!settings.enabled || !(await Notifications.getPermissionsAsync()).granted) {
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(this.CHANNEL_ID, {
        name: 'Lembretes',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const now = new Date();
    const atHour = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, settings.hour);
    const firstOffset = streak.loggedToday || atHour(0) <= now ? 1 : 0;

    for (let offset = firstOffset; offset < firstOffset + this.DAYS_AHEAD; offset += 1) {
      // The current count is only certain for the next reminder; later ones stay generic.
      const knowsStreak = offset === firstOffset && (offset === 0 || streak.loggedToday) && streak.currentStreak > 0;
      await Notifications.scheduleNotificationAsync({
        identifier: `${this.ID_PREFIX}${offset}`,
        content: {
          title: 'Hora de registrar',
          body: knowsStreak
            ? `Sua sequência está em ${streak.currentStreak} ${streak.currentStreak === 1 ? 'dia' : 'dias'}. Registre o que você comeu hoje.`
            : 'Registre o que você comeu hoje para manter a constância.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: atHour(offset),
          channelId: this.CHANNEL_ID,
        },
      });
    }
  }

  static async cancel(): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled
      .filter(item => item.identifier.startsWith(this.ID_PREFIX))
      .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  }

  static async reset(): Promise<void> {
    await this.cancel();
    await AsyncStorage.removeItem(this.KEY);
  }
}

export namespace StreakReminder {
  export type Settings = {
    enabled: boolean;
    hour: number;
  };
}
