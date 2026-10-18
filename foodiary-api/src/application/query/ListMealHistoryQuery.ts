import { Meal } from '@application/entities/Meal';
import { getPostgresPool } from '@infra/database/postgres/pool';
import { Injectable } from '@kernel/decorators/Injectable';

type MealRow = { id: string; created_at: Date; cursor_created_at: string; name: string; icon: string; foods: Meal.Food[] };

@Injectable()
export class ListMealHistoryQuery {
  async execute({ accountId, limit, cursor }: {
    accountId: string;
    limit: number;
    cursor?: { createdAt: string; id: string };
  }) {
    const { rows } = await getPostgresPool().query<MealRow>(
      `SELECT id, created_at, name, icon, foods,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at
       FROM meals
       WHERE account_id = $1 AND status = $2
         AND ($3::timestamptz IS NULL OR (created_at, id) < ($3::timestamptz, $4::text))
       ORDER BY created_at DESC, id DESC
       LIMIT $5`,
      [accountId, Meal.Status.SUCCESS, cursor?.createdAt ?? null, cursor?.id ?? null, limit + 1],
    );
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      meals: page.map(row => ({
        id: row.id, createdAt: row.created_at.toISOString(), name: row.name, icon: row.icon, foods: row.foods,
      })),
      nextCursor: rows.length > limit && last
        ? Buffer.from(JSON.stringify({ createdAt: last.cursor_created_at, id: last.id })).toString('base64url')
        : null,
    };
  }
}
