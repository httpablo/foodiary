import { Meal } from '@application/entities/Meal';
import { calculateFoodCalories } from '@application/entities/calculateFoodCalories';
import { getPostgresPool } from '@infra/database/postgres/pool';
import { Injectable } from '@kernel/decorators/Injectable';

type MealRow = {
  created_at: Date;
  foods: Meal.Food[];
};

type Totals = {
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
};

const dayMilliseconds = 24 * 60 * 60 * 1000;
// Symmetric band: eating far below the goal does not count as hitting it.
const onTargetTolerance = 0.1;
const roundGrams = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class GetWeeklySummaryQuery {
  async execute({ accountId, startDate, timezoneOffsetMinutes }: GetWeeklySummaryQuery.Input): Promise<GetWeeklySummaryQuery.Output> {
    const utcStart = startDate.getTime() + timezoneOffsetMinutes * 60 * 1000;
    const [{ rows }, { rows: goalRows }] = await Promise.all([
      getPostgresPool().query<MealRow>(
        `SELECT created_at, foods FROM meals
         WHERE account_id = $1 AND status = $2
           AND created_at >= $3::timestamptz
           AND created_at < $4::timestamptz`,
        [accountId, Meal.Status.SUCCESS, new Date(utcStart), new Date(utcStart + 7 * dayMilliseconds)],
      ),
      getPostgresPool().query<{ calories: number }>(
        'SELECT calories FROM goals WHERE account_id = $1',
        [accountId],
      ),
    ]);
    const calorieGoal = goalRows[0]?.calories ?? 0;

    const days: GetWeeklySummaryQuery.Day[] = Array.from({ length: 7 }, (_, index) => ({
      date: new Date(startDate.getTime() + index * dayMilliseconds).toISOString().slice(0, 10),
      mealCount: 0,
      totals: null,
      onTarget: false,
    }));

    for (const row of rows) {
      const index = Math.floor((row.created_at.getTime() - utcStart) / dayMilliseconds);
      const day = days[index];
      if (!day) {
        continue;
      }
      day.mealCount += 1;
      day.totals ??= { calories: 0, proteins: 0, carbohydrates: 0, fats: 0 };
      for (const food of row.foods) {
        day.totals.calories += calculateFoodCalories(food);
        day.totals.proteins += food.proteins;
        day.totals.carbohydrates += food.carbohydrates;
        day.totals.fats += food.fats;
      }
    }

    const recorded = days.filter(day => day.totals !== null);
    const sum = recorded.reduce<Totals>((acc, day) => ({
      calories: acc.calories + day.totals!.calories,
      proteins: acc.proteins + day.totals!.proteins,
      carbohydrates: acc.carbohydrates + day.totals!.carbohydrates,
      fats: acc.fats + day.totals!.fats,
    }), { calories: 0, proteins: 0, carbohydrates: 0, fats: 0 });
    for (const day of recorded) {
      day.onTarget = calorieGoal > 0
        && Math.abs(day.totals!.calories - calorieGoal) <= calorieGoal * onTargetTolerance;
      day.totals!.proteins = roundGrams(day.totals!.proteins);
      day.totals!.carbohydrates = roundGrams(day.totals!.carbohydrates);
      day.totals!.fats = roundGrams(day.totals!.fats);
    }

    return {
      days,
      recordedDays: recorded.length,
      daysOnTarget: recorded.filter(day => day.onTarget).length,
      averages: recorded.length === 0 ? null : {
        calories: Math.round(sum.calories / recorded.length),
        proteins: roundGrams(sum.proteins / recorded.length),
        carbohydrates: roundGrams(sum.carbohydrates / recorded.length),
        fats: roundGrams(sum.fats / recorded.length),
      },
    };
  }
}

export namespace GetWeeklySummaryQuery {
  export type Input = {
    accountId: string;
    startDate: Date;
    timezoneOffsetMinutes: number;
  };

  export type Day = {
    date: string;
    mealCount: number;
    totals: Totals | null;
    onTarget: boolean;
  };

  export type Output = {
    days: Day[];
    recordedDays: number;
    daysOnTarget: number;
    averages: Totals | null;
  };
}
