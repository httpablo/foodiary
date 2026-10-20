export type AchievementCode =
  | 'FIRST_MEAL'
  | 'STREAK_7'
  | 'STREAK_30'
  | 'STREAK_100'
  | 'WEEKLY_TARGET'
  | 'WEIGH_IN_4_WEEKS'
  | 'WEIGHT_GOAL_25'
  | 'WEIGHT_GOAL_50'
  | 'WEIGHT_GOAL_75'
  | 'WEIGHT_GOAL_REACHED'
  | 'SAVED_FOOD'
  | 'PICTURE_MEAL'
  | 'AUDIO_MEAL';

export type UnlockedAchievement = {
  code: AchievementCode;
  unlockedAt: string;
  acknowledgedAt: string | null;
};
