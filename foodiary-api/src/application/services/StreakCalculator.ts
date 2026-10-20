import { addDays } from '@application/shared/localDate';

export class StreakCalculator {
  static daysPerFreeze = 7;

  static maxFreezes = 2;

  // Walks every day since the first log. A finished day without meals spends a freeze
  // (keeping the streak without adding to it); without freezes the streak restarts.
  static calculate(loggedDays: string[], today: string): StreakCalculator.Result {
    const recorded = new Set(loggedDays.filter(day => day <= today));
    const firstDay = [...recorded].sort()[0];
    const frozenDates: string[] = [];
    let currentStreak = 0;
    let bestStreak = 0;
    let freezesAvailable = 0;
    let freezeProgress = 0;

    for (let day = firstDay; day !== undefined && day <= today; day = addDays(day, 1)) {
      if (recorded.has(day)) {
        currentStreak += 1;
        bestStreak = Math.max(bestStreak, currentStreak);
        if (freezesAvailable < this.maxFreezes) {
          freezeProgress += 1;
          if (freezeProgress === this.daysPerFreeze) {
            freezesAvailable += 1;
            freezeProgress = 0;
          }
        }
      } else if (day === today) {
        // Today stays open until it ends.
        break;
      } else if (currentStreak > 0 && freezesAvailable > 0) {
        freezesAvailable -= 1;
        frozenDates.push(day);
      } else {
        currentStreak = 0;
        freezeProgress = 0;
      }
    }

    return {
      currentStreak,
      bestStreak,
      loggedToday: recorded.has(today),
      freezesAvailable,
      daysUntilNextFreeze: freezesAvailable < this.maxFreezes ? this.daysPerFreeze - freezeProgress : null,
      frozenDates,
    };
  }
}

export namespace StreakCalculator {
  export type Result = {
    currentStreak: number;
    bestStreak: number;
    loggedToday: boolean;
    freezesAvailable: number;
    daysUntilNextFreeze: number | null;
    frozenDates: string[];
  };
}
