export type NutritionTotals = {
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
};

export type WeeklySummary = {
  days: {
    date: string;
    mealCount: number;
    totals: NutritionTotals | null;
  }[];
  recordedDays: number;
  averages: NutritionTotals | null;
};
