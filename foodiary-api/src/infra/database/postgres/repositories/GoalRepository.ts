import { Goal } from '@application/entities/Goal';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { Injectable } from '@kernel/decorators/Injectable';
import { Pool } from 'pg';
import { getPostgresPool } from '../pool';

type Queryable = Pick<Pool, 'query'>;

type GoalRow = {
  account_id: string;
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
  source: Goal.Source;
  calculated_for_weight: number | null;
  created_at: Date;
};

@Injectable()
export class GoalRepository {
  async findByAccountId(accountId: string): Promise<Goal | null> {
    const { rows } = await getPostgresPool().query<GoalRow>(
      `SELECT account_id, calories, proteins, carbohydrates, fats, source, calculated_for_weight, created_at
       FROM goals WHERE account_id = $1`,
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
      source: row.source,
      calculatedForWeight: row.calculated_for_weight === null ? null : Number(row.calculated_for_weight),
      createdAt: row.created_at,
    });
  }

  async save(goal: Goal, db: Queryable = getPostgresPool()): Promise<void> {
    const result = await db.query(
      `UPDATE goals
       SET calories = $2, proteins = $3, carbohydrates = $4, fats = $5,
           source = $6, calculated_for_weight = COALESCE($7, calculated_for_weight)
       WHERE account_id = $1`,
      [
        goal.accountId,
        goal.calories,
        goal.proteins,
        goal.carbohydrates,
        goal.fats,
        goal.source,
        goal.calculatedForWeight,
      ],
    );
    if (result.rowCount === 0) {
      throw new ResourceNotFound('Profile not found.');
    }
  }
}
