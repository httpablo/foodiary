import { Goal } from '@application/entities/Goal';
import { Injectable } from '@kernel/decorators/Injectable';
import { getPostgresPool } from '../pool';

type GoalRow = {
  account_id: string;
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
  created_at: Date;
};

@Injectable()
export class GoalRepository {
  async findByAccountId(accountId: string): Promise<Goal | null> {
    const { rows } = await getPostgresPool().query<GoalRow>(
      'SELECT account_id, calories, proteins, carbohydrates, fats, created_at FROM goals WHERE account_id = $1',
      [accountId],
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    return new Goal({
      accountId: row.account_id,
      calories: row.calories,
      proteins: row.proteins,
      carbohydrates: row.carbohydrates,
      fats: row.fats,
      createdAt: row.created_at,
    });
  }

  async save(goal: Goal): Promise<void> {
    await getPostgresPool().query(
      `UPDATE goals
       SET calories = $2, proteins = $3, carbohydrates = $4, fats = $5
       WHERE account_id = $1`,
      [goal.accountId, goal.calories, goal.proteins, goal.carbohydrates, goal.fats],
    );
  }
}
