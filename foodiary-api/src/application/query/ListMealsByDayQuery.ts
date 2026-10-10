import { Meal } from '@application/entities/Meal';
import { getPostgresPool } from '@infra/database/postgres/pool';
import { Injectable } from '@kernel/decorators/Injectable';

type MealRow = {
  id: string;
  created_at: Date;
  name: string;
  icon: string;
  foods: Meal.Food[];
};

@Injectable()
export class ListMealsByDayQuery {
  async execute({ accountId, date, timezoneOffsetMinutes = 0 }: ListMealsByDayQuery.Input): Promise<ListMealsByDayQuery.Output> {
    const dayStart = new Date(date.getTime() + timezoneOffsetMinutes * 60 * 1000);
    const nextDay = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const { rows } = await getPostgresPool().query<MealRow>(
      `SELECT id, created_at, name, icon, foods
       FROM meals
       WHERE account_id = $1
         AND status = $2
         AND created_at >= $3::timestamptz
         AND created_at < $4::timestamptz
       ORDER BY created_at DESC`,
      [accountId, Meal.Status.SUCCESS, dayStart, nextDay],
    );

    return {
      meals: rows.map(row => ({
        id: row.id,
        createdAt: row.created_at.toISOString(),
        name: row.name,
        icon: row.icon,
        foods: row.foods,
      })),
    };
  }
}

export namespace ListMealsByDayQuery {
  export type Input = { accountId: string; date: Date; timezoneOffsetMinutes?: number };

  export type Output = {
    meals: {
      id: string;
      createdAt: string;
      name: string;
      icon: string;
      foods: Meal.Food[];
    }[];
  };
}
