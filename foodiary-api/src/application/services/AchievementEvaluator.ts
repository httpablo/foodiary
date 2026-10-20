import { Achievement } from '@application/entities/Achievement';
import { diffInDays, startOfWeek } from '@application/shared/localDate';

export class AchievementEvaluator {
  static weeklyLogTarget = 5;

  static evaluate(facts: AchievementEvaluator.Facts): Achievement.Code[] {
    const { Code } = Achievement;
    const weightGoalPercent = facts.weightGoalReached ? 100 : facts.weightGoalPercent ?? 0;
    const rules: [Achievement.Code, boolean][] = [
      [Code.FIRST_MEAL, facts.mealCount > 0],
      [Code.STREAK_7, facts.bestStreak >= 7],
      [Code.STREAK_30, facts.bestStreak >= 30],
      [Code.STREAK_100, facts.bestStreak >= 100],
      [Code.WEEKLY_TARGET, this.bestWeekLoggedDays(facts.loggedDays) >= this.weeklyLogTarget],
      [Code.WEIGH_IN_4_WEEKS, this.longestWeeklyRun(facts.weightLogDates) >= 4],
      [Code.WEIGHT_GOAL_25, weightGoalPercent >= 25],
      [Code.WEIGHT_GOAL_50, weightGoalPercent >= 50],
      [Code.WEIGHT_GOAL_75, weightGoalPercent >= 75],
      [Code.WEIGHT_GOAL_REACHED, facts.weightGoalReached],
      [Code.SAVED_FOOD, facts.hasSavedFood],
      [Code.PICTURE_MEAL, facts.hasPictureMeal],
      [Code.AUDIO_MEAL, facts.hasAudioMeal],
    ];

    return rules.filter(([, met]) => met).map(([code]) => code);
  }

  private static bestWeekLoggedDays(days: string[]): number {
    const perWeek = new Map<string, number>();
    for (const day of days) {
      const week = startOfWeek(day);
      perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
    }
    return Math.max(0, ...perWeek.values());
  }

  private static longestWeeklyRun(dates: string[]): number {
    const weeks = [...new Set(dates.map(startOfWeek))].sort();
    let best = 0;
    let run = 0;
    for (const [index, week] of weeks.entries()) {
      run = index > 0 && diffInDays(weeks[index - 1]!, week) === 7 ? run + 1 : 1;
      best = Math.max(best, run);
    }
    return best;
  }
}

export namespace AchievementEvaluator {
  export type Facts = {
    mealCount: number;
    bestStreak: number;
    // Distinct local days that count for the streak.
    loggedDays: string[];
    weightLogDates: string[];
    weightGoalPercent: number | null;
    weightGoalReached: boolean;
    hasSavedFood: boolean;
    hasPictureMeal: boolean;
    hasAudioMeal: boolean;
  };
}
