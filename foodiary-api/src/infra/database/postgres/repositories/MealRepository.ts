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

  async save(meal: Meal): Promise<void> {
    await getPostgresPool().query(
      `UPDATE meals
       SET status = $3, attempts = $4, name = $5, icon = $6, foods = $7::jsonb
       WHERE id = $1 AND account_id = $2`,
      [
        meal.id,
        meal.accountId,
        meal.status,
        meal.attempts,
        meal.name,
        meal.icon,
        JSON.stringify(meal.foods),
      ],
    );
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

  async deleteCompleted({ mealId, accountId }: MealRepository.FindByIdParams): Promise<{ inputFileKey: string | null } | null> {
    const { rows } = await getPostgresPool().query<{ input_file_key: string | null }>(
      `DELETE FROM meals WHERE id = $1 AND account_id = $2 AND status = $3
       RETURNING input_file_key`,
      [mealId, accountId, Meal.Status.SUCCESS],
    );
    return rows[0] ? { inputFileKey: rows[0].input_file_key } : null;
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
