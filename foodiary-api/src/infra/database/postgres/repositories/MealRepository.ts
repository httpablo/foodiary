import { Meal } from '@application/entities/Meal';
import { Injectable } from '@kernel/decorators/Injectable';
import { getPostgresPool } from '../pool';

type MealRow = {
  id: string;
  account_id: string;
  status: Meal.Status;
  attempts: number;
  input_type: Meal.InputType;
  input_file_key: string | null;
  name: string;
  icon: string;
  foods: Meal.Food[];
  created_at: Date;
};

@Injectable()
export class MealRepository {
  async findById({ mealId, accountId }: MealRepository.FindByIdParams): Promise<Meal | null> {
    const { rows } = await getPostgresPool().query<MealRow>(
      `SELECT id, account_id, status, attempts, input_type, input_file_key,
              name, icon, foods, created_at
       FROM meals WHERE id = $1 AND account_id = $2`,
      [mealId, accountId],
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    return new Meal({
      id: row.id,
      accountId: row.account_id,
      status: row.status,
      attempts: row.attempts,
      inputType: row.input_type,
      inputFileKey: row.input_file_key,
      name: row.name,
      icon: row.icon,
      foods: row.foods,
      createdAt: row.created_at,
    });
  }

  async updateContents({ mealId, accountId, name, foods }: {
    mealId: string;
    accountId: string;
    name: string;
    foods: Meal.Food[];
  }): Promise<boolean> {
    const result = await getPostgresPool().query(
      `UPDATE meals SET name = $3, foods = $4::jsonb
       WHERE id = $1 AND account_id = $2 AND status = $5`,
      [mealId, accountId, name, JSON.stringify(foods), Meal.Status.SUCCESS],
    );
    return result.rowCount === 1;
  }

  async deleteDeletable({ mealId, accountId }: MealRepository.FindByIdParams): Promise<{ inputFileKey: string | null } | null> {
    const { rows } = await getPostgresPool().query<{ input_file_key: string | null }>(
      `DELETE FROM meals
       WHERE id = $1 AND account_id = $2
         AND status IN ($3, $4, $5)
       RETURNING input_file_key`,
      [mealId, accountId, Meal.Status.UPLOADING, Meal.Status.SUCCESS, Meal.Status.FAILED],
    );
    return rows[0] ? { inputFileKey: rows[0].input_file_key } : null;
  }

  async deleteCompleted(params: MealRepository.FindByIdParams): Promise<{ inputFileKey: string | null } | null> {
    return this.deleteDeletable(params);
  }

  // Local days with a completed meal registered by the end of the next day, oldest first.
  async listLoggedDays(accountId: string, timezoneOffsetMinutes: number): Promise<string[]> {
    const { rows } = await getPostgresPool().query<{ day: string }>(
      `SELECT DISTINCT day::text AS day FROM (
         SELECT ((created_at AT TIME ZONE 'UTC') - $3::int * INTERVAL '1 minute')::date AS day,
                ((logged_at AT TIME ZONE 'UTC') - $3::int * INTERVAL '1 minute')::date AS logged_day
         FROM meals
         WHERE account_id = $1 AND status = $2
       ) AS local_meals
       WHERE logged_day <= day + 1
       ORDER BY day`,
      [accountId, Meal.Status.SUCCESS, timezoneOffsetMinutes],
    );
    return rows.map(row => row.day);
  }

  async hasInputFile(fileKey: string): Promise<boolean> {
    const accountId = fileKey.split('/')[0];
    const { rowCount } = await getPostgresPool().query(
      'SELECT 1 FROM meals WHERE account_id = $1 AND input_file_key = $2 LIMIT 1',
      [accountId, fileKey],
    );
    return rowCount === 1;
  }

  async markUploaded(meal: Meal): Promise<boolean> {
    const result = await getPostgresPool().query(
      `UPDATE meals SET status = $3
       WHERE id = $1 AND account_id = $2 AND status = $4`,
      [meal.id, meal.accountId, Meal.Status.QUEUED, Meal.Status.UPLOADING],
    );
    return result.rowCount === 1;
  }

  async create(meal: Meal): Promise<void> {
    await getPostgresPool().query(
      `INSERT INTO meals
         (id, account_id, status, attempts, input_type, input_file_key,
          name, icon, foods, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
      [
        meal.id,
        meal.accountId,
        meal.status,
        meal.attempts,
        meal.inputType,
        meal.inputFileKey,
        meal.name,
        meal.icon,
        JSON.stringify(meal.foods),
        meal.createdAt,
      ],
    );
  }
}

export namespace MealRepository {
  export type FindByIdParams = {
    mealId: string;
    accountId: string;
  };
}
