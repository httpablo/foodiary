// Scheduled local notifications are not available on the web.
export class StreakReminder {
  static isSupported = false;

  static hours = [19, 20, 21, 22] as const;

  static async loadSettings(): Promise<StreakReminder.Settings> {
    return { enabled: false, hour: 20 };
  }

  static async saveSettings(): Promise<void> {}

  static async requestPermission(): Promise<boolean> {
    return false;
  }

  static async sync(): Promise<void> {}

  static async cancel(): Promise<void> {}

  static async reset(): Promise<void> {}
}

export namespace StreakReminder {
  export type Settings = {
    enabled: boolean;
    hour: number;
  };
}
