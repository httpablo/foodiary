import { WeightGoal } from '@application/entities/WeightGoal';
import { Injectable } from '@kernel/decorators/Injectable';
import { Pool } from 'pg';
import { getPostgresPool } from '../pool';

type Queryable = Pick<Pool, 'query'>;

type WeightGoalRow = {
  id: string;
  account_id: string;
  start_weight: number;
  target_weight: number;
  start_date: string;
  pace_kg_per_week: number;
  status: WeightGoal.Status;
  achieved_at: Date | null;
  acknowledged_at: Date | null;
  created_at: Date;
};

const columns = `id, account_id, start_weight, target_weight, start_date::text AS start_date,
  pace_kg_per_week, status, achieved_at, acknowledged_at, created_at`;

function toEntity(row: WeightGoalRow): WeightGoal {
  return new WeightGoal({
    id: row.id,
    accountId: row.account_id,
    startWeight: Number(row.start_weight),
    targetWeight: Number(row.target_weight),
    startDate: row.start_date,
    paceKgPerWeek: Number(row.pace_kg_per_week),
    status: row.status,
    achievedAt: row.achieved_at,
    acknowledgedAt: row.acknowledged_at,
    createdAt: row.created_at,
  });
}

@Injectable()
export class WeightGoalRepository {
  async findActive(accountId: string): Promise<WeightGoal | null> {
    const { rows } = await getPostgresPool().query<WeightGoalRow>(
      `SELECT ${columns} FROM weight_goals WHERE account_id = $1 AND status = 'ACTIVE'`,
      [accountId],
    );

    return rows[0] ? toEntity(rows[0]) : null;
  }

  // The active goal, else the latest achieved goal that was not acknowledged yet.
  async findCurrent(accountId: string): Promise<WeightGoal | null> {
    const { rows } = await getPostgresPool().query<WeightGoalRow>(
      `SELECT ${columns} FROM weight_goals
       WHERE account_id = $1
         AND (status = 'ACTIVE' OR (status = 'ACHIEVED' AND acknowledged_at IS NULL))
       ORDER BY (status = 'ACTIVE') DESC, achieved_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [accountId],
    );

    return rows[0] ? toEntity(rows[0]) : null;
  }

  async insert(goal: WeightGoal, db: Queryable = getPostgresPool()): Promise<void> {
    await db.query(
      `INSERT INTO weight_goals
         (id, account_id, start_weight, target_weight, start_date, pace_kg_per_week, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $8)`,
      [
        goal.id,
        goal.accountId,
        goal.startWeight,
        goal.targetWeight,
        goal.startDate,
        goal.paceKgPerWeek,
        goal.status,
        goal.createdAt,
      ],
    );
  }

  // Abandons the active goal and acknowledges pending achievements.
  async closeCurrent(accountId: string, db: Queryable = getPostgresPool()): Promise<void> {
    await db.query(
      `UPDATE weight_goals
       SET status = CASE WHEN status = 'ACTIVE' THEN 'ABANDONED' ELSE status END,
           acknowledged_at = CASE WHEN status = 'ACHIEVED' THEN NOW() ELSE acknowledged_at END,
           updated_at = NOW()
       WHERE account_id = $1
         AND (status = 'ACTIVE' OR (status = 'ACHIEVED' AND acknowledged_at IS NULL))`,
      [accountId],
    );
  }

  // Flips the active goal to ACHIEVED when the weight reached the target and
  // returns the profile to MAINTAIN in the same statement.
  async markAchievedIfReached(accountId: string, weight: number): Promise<boolean> {
    const { rowCount } = await getPostgresPool().query(
      `WITH achieved AS (
         UPDATE weight_goals
         SET status = 'ACHIEVED', achieved_at = NOW(), updated_at = NOW()
         WHERE account_id = $1
           AND status = 'ACTIVE'
           AND (
             (target_weight < start_weight AND $2 <= target_weight)
             OR (target_weight > start_weight AND $2 >= target_weight)
           )
         RETURNING account_id
       )
       UPDATE profiles SET goal = 'MAINTAIN'
       WHERE account_id IN (SELECT account_id FROM achieved)`,
      [accountId, weight],
    );

    return (rowCount ?? 0) > 0;
  }
}
