import { Meal } from '@application/entities/Meal';
import { Injectable } from '@kernel/decorators/Injectable';
import KSUID from 'ksuid';
import { getPostgresPool } from '../pool';

export type SavedFood = Pick<Meal.Food, 'name' | 'quantity' | 'proteins' | 'carbohydrates' | 'fats'> & {
  id: string;
};

@Injectable()
export class SavedFoodRepository {
  async list(accountId: string): Promise<SavedFood[]> {
    const { rows } = await getPostgresPool().query<SavedFood>(
      `SELECT id, name, quantity, proteins, carbohydrates, fats
       FROM saved_foods WHERE account_id = $1
       ORDER BY updated_at DESC, id DESC`,
      [accountId],
    );
    return rows;
  }

  async save(accountId: string, food: Omit<SavedFood, 'id'>): Promise<string> {
    const { rows } = await getPostgresPool().query<{ id: string }>(
      `INSERT INTO saved_foods
         (id, account_id, name, quantity, proteins, carbohydrates, fats)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (account_id, LOWER(name), LOWER(quantity)) DO UPDATE
       SET name = EXCLUDED.name, quantity = EXCLUDED.quantity,
           proteins = EXCLUDED.proteins, carbohydrates = EXCLUDED.carbohydrates,
           fats = EXCLUDED.fats, updated_at = NOW()
       RETURNING id`,
      [KSUID.randomSync().string, accountId, food.name, food.quantity,
        food.proteins, food.carbohydrates, food.fats],
    );
    return rows[0].id;
  }

  async delete(accountId: string, foodId: string): Promise<boolean> {
    const result = await getPostgresPool().query(
      'DELETE FROM saved_foods WHERE account_id = $1 AND id = $2',
      [accountId, foodId],
    );
    return result.rowCount === 1;
  }
}
