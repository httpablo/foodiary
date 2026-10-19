import { WeightGoalSummary as DailyGoal } from './WeightLog';

export type WeightGoalDirection = 'LOSE' | 'GAIN';

export type WeightGoalStatus = 'ACTIVE' | 'ACHIEVED';

export type WeightGoalPaceKey = 'RELAXED' | 'RECOMMENDED' | 'AGGRESSIVE';

export type WeightGoalTrackStatus = 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'OFF_TRACK' | 'NOT_ENOUGH_DATA';

export type HealthyWeightRange = {
  min: number;
  max: number;
};

export type WeightGoalProgress = {
  totalKg: number;
  changedKg: number;
  remainingKg: number;
  percent: number;
  plannedDate: string;
  projectedDate: string | null;
  weeklyRateKg: number | null;
  trackStatus: WeightGoalTrackStatus;
};

export type WeightGoal = {
  id: string;
  status: WeightGoalStatus;
  direction: WeightGoalDirection;
  startWeight: number;
  targetWeight: number;
  startDate: string;
  paceKgPerWeek: number;
  achievedAt: string | null;
  progress: WeightGoalProgress;
};

export type WeightGoalOverview = {
  currentWeight: number;
  trendWeight: number | null;
  healthyRange: HealthyWeightRange;
  weightGoal: WeightGoal | null;
};

export type WeightGoalPaceOption = {
  key: WeightGoalPaceKey;
  paceKgPerWeek: number;
  weeks: number;
  estimatedDate: string;
  dailyGoal: DailyGoal;
};

export type WeightGoalPreview = {
  currentWeight: number;
  targetWeight: number;
  direction: WeightGoalDirection;
  healthyRange: HealthyWeightRange;
  targetBmi: number;
  warnings: string[];
  currentDailyGoal: DailyGoal;
  options: WeightGoalPaceOption[];
};
