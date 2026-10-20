export type Streak = {
  currentStreak: number;
  bestStreak: number;
  loggedToday: boolean;
  freezesAvailable: number;
  daysUntilNextFreeze: number | null;
  frozenDates: string[];
};
