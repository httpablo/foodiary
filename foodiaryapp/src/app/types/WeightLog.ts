export type WeightLogEntry = {
  id: string;
  weight: number;
  date: string;
  updatedAt: string;
};

export type WeightGoalSummary = {
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
};

export type WeightLogsSummary = {
  logs: WeightLogEntry[];
  currentWeight: number;
  startWeight: number;
  weightChange: number;
  currentGoal: WeightGoalSummary;
  suggestedGoal: WeightGoalSummary;
};
