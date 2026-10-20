export namespace Achievement {
  export enum Code {
    FIRST_MEAL = 'FIRST_MEAL',
    STREAK_7 = 'STREAK_7',
    STREAK_30 = 'STREAK_30',
    STREAK_100 = 'STREAK_100',
    WEEKLY_TARGET = 'WEEKLY_TARGET',
    WEIGH_IN_4_WEEKS = 'WEIGH_IN_4_WEEKS',
    WEIGHT_GOAL_25 = 'WEIGHT_GOAL_25',
    WEIGHT_GOAL_50 = 'WEIGHT_GOAL_50',
    WEIGHT_GOAL_75 = 'WEIGHT_GOAL_75',
    WEIGHT_GOAL_REACHED = 'WEIGHT_GOAL_REACHED',
    SAVED_FOOD = 'SAVED_FOOD',
    PICTURE_MEAL = 'PICTURE_MEAL',
    AUDIO_MEAL = 'AUDIO_MEAL',
  }

  export type Unlocked = {
    code: Code;
    unlockedAt: string;
    acknowledgedAt: string | null;
  };
}
