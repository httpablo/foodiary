import { Injectable } from '@kernel/decorators/Injectable';
import KSUID from 'ksuid';
import { getPostgresPool } from '../pool';

export type WeightLogEntry = {
  id: string;
  weight: number;
  date: string;
  updatedAt: string;
};

type WeightLogRow = {
  id: string;
  weight: number;
  date: string;
  updated_at: Date;
};

@Injectable()
export class WeightLogRepository {
  async list(accountId: string, limit = 30): Promise<WeightLogEntry[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 365);
    const { rows } = await getPostgresPool().query<WeightLogRow>(
      `SELECT id, weight, date::text AS date, updated_at
       FROM weight_logs
       WHERE account_id = $1
       ORDER BY date DESC, updated_at DESC
       LIMIT $2`,
      [accountId, safeLimit],
    );

    return rows.map(row => ({
      id: row.id,
      weight: Number(row.weight),
      date: row.date,
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async getStartWeight(accountId: string): Promise<number | null> {
    const { rows } = await getPostgresPool().query<{ start_weight: number }>(
      `SELECT COALESCE(
         p.initial_weight,
         (SELECT wl.weight FROM weight_logs wl WHERE wl.account_id = p.account_id ORDER BY wl.date ASC, wl.updated_at ASC LIMIT 1),
         p.weight
       ) AS start_weight
       FROM profiles p
       WHERE p.account_id = $1`,
      [accountId],
    );

    return rows[0] ? Number(rows[0].start_weight) : null;
  }

  async upsert({
    accountId,
    weight,
    date,
  }: {
    accountId: string;
    weight: number;
    date: string;
  }): Promise<WeightLogEntry> {
    const { rows } = await getPostgresPool().query<WeightLogRow>(
      `WITH upserted AS (
         INSERT INTO weight_logs (id, account_id, weight, date, updated_at)
         VALUES ($1, $2, $3, $4::date, NOW())
         ON CONFLICT (account_id, date) DO UPDATE
         SET weight = EXCLUDED.weight, updated_at = NOW()
         RETURNING id, account_id, weight, date::text AS date, updated_at
       ), updated_profile AS (
         UPDATE profiles p
         SET weight = $3
         WHERE p.account_id = $2
           AND NOT EXISTS (
             SELECT 1 FROM weight_logs wl
             WHERE wl.account_id = $2 AND wl.date > $4::date
           )
       )
       SELECT id, weight, date, updated_at FROM upserted`,
      [KSUID.randomSync().string, accountId, weight, date],
    );

    const row = rows[0];
    return {
      id: row.id,
      weight: Number(row.weight),
      date: row.date,
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
