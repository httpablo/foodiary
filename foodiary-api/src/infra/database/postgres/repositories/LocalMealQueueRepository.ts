import { Meal } from '@application/entities/Meal';
import { Injectable } from '@kernel/decorators/Injectable';
import { getPostgresPool } from '../pool';
import { MealRepository } from './MealRepository';

const maxAttempts = 2;

@Injectable([MealRepository])
export class LocalMealQueueRepository {
  constructor(private readonly meals: MealRepository) {}

  async recoverExpired(accountId?: string): Promise<void> {
    await getPostgresPool().query(
      `UPDATE meals
       SET status = CASE WHEN attempts >= $1 THEN 'FAILED' ELSE 'QUEUED' END,
           available_at = NOW(), processing_started_at = NULL
       WHERE status = 'PROCESSING' AND ($2::text IS NULL OR account_id = $2)
         AND (processing_started_at IS NULL OR processing_started_at < NOW() - INTERVAL '15 minutes')`,
      [maxAttempts, accountId ?? null],
    );
    await getPostgresPool().query(
      `UPDATE meals SET status = 'FAILED'
       WHERE status = 'QUEUED' AND attempts >= $1
         AND ($2::text IS NULL OR account_id = $2)`,
      [maxAttempts, accountId ?? null],
    );
  }

  async claimNext(accountId?: string): Promise<Meal | null> {
    const { rows } = await getPostgresPool().query<{ id: string; account_id: string }>(
      `WITH next_meal AS (
         SELECT id FROM meals
         WHERE status = 'QUEUED' AND attempts < $1 AND available_at <= NOW()
           AND ($2::text IS NULL OR account_id = $2)
         ORDER BY available_at, created_at
         FOR UPDATE SKIP LOCKED LIMIT 1
       )
       UPDATE meals AS meal
       SET status = 'PROCESSING', attempts = meal.attempts + 1,
           processing_started_at = NOW()
       FROM next_meal WHERE meal.id = next_meal.id
       RETURNING meal.id, meal.account_id`,
      [maxAttempts, accountId ?? null],
    );
    const row = rows[0];
    return row ? this.meals.findById({ mealId: row.id, accountId: row.account_id }) : null;
  }

  async claimById(accountId: string, mealId: string): Promise<Meal | null> {
    const { rows } = await getPostgresPool().query<{ id: string }>(
      `UPDATE meals SET status = 'PROCESSING', attempts = attempts + 1,
           processing_started_at = NOW()
       WHERE id = $1 AND account_id = $2 AND status = 'QUEUED'
         AND attempts < $3 AND available_at <= NOW()
       RETURNING id`,
      [mealId, accountId, maxAttempts],
    );
    return rows[0] ? this.meals.findById({ mealId, accountId }) : null;
  }

  async completeSuccess(meal: Meal, result: { name: string; icon: string; foods: Meal.Food[] }): Promise<boolean> {
    const update = await getPostgresPool().query(
      `UPDATE meals SET status = 'SUCCESS', name = $4, icon = $5,
         foods = $6::jsonb, processing_started_at = NULL
       WHERE id = $1 AND account_id = $2 AND status = 'PROCESSING' AND attempts = $3`,
      [meal.id, meal.accountId, meal.attempts, result.name, result.icon, JSON.stringify(result.foods)],
    );
    return update.rowCount === 1;
  }

  async completeFailure(meal: Meal): Promise<boolean> {
    const update = await getPostgresPool().query(
      `UPDATE meals
       SET status = CASE WHEN attempts >= $4 THEN 'FAILED' ELSE 'QUEUED' END,
           available_at = NOW() + INTERVAL '30 seconds', processing_started_at = NULL
       WHERE id = $1 AND account_id = $2 AND status = 'PROCESSING' AND attempts = $3`,
      [meal.id, meal.accountId, meal.attempts, maxAttempts],
    );
    return update.rowCount === 1;
  }
}
