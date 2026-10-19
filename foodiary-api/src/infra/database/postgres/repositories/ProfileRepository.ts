import { Profile } from '@application/entities/Profile';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { Injectable } from '@kernel/decorators/Injectable';
import { Pool } from 'pg';
import { getPostgresPool } from '../pool';

type Queryable = Pick<Pool, 'query'>;

type ProfileRow = {
  account_id: string;
  name: string;
  birth_date: string;
  gender: Profile.Gender;
  height: number;
  weight: number;
  activity_level: Profile.ActivityLevel;
  goal: Profile.Goal;
  created_at: Date;
};

@Injectable()
export class ProfileRepository {
  async setPhotoFileKey(accountId: string, fileKey: string): Promise<string | null | undefined> {
    const { rows } = await getPostgresPool().query<{ photo_file_key: string | null }>(
      `WITH previous AS (
         SELECT photo_file_key FROM profiles WHERE account_id = $1 FOR UPDATE
       ), updated AS (
         UPDATE profiles SET photo_file_key = $2 WHERE account_id = $1 RETURNING account_id
       )
       SELECT previous.photo_file_key FROM previous JOIN updated ON true`,
      [accountId, fileKey],
    );
    return rows[0]?.photo_file_key;
  }

  async findByAccountId(accountId: string): Promise<Profile | null> {
    const { rows } = await getPostgresPool().query<ProfileRow>(
      `SELECT account_id, name, birth_date::text AS birth_date, gender, height,
              weight, activity_level, goal, created_at
       FROM profiles WHERE account_id = $1`,
      [accountId],
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    return new Profile({
      accountId: row.account_id,
      name: row.name,
      birthDate: new Date(`${row.birth_date}T00:00:00.000Z`),
      gender: row.gender,
      height: row.height,
      weight: row.weight,
      activityLevel: row.activity_level,
      goal: row.goal,
      createdAt: row.created_at,
    });
  }

  async setGoal(accountId: string, goal: Profile.Goal, db: Queryable = getPostgresPool()): Promise<void> {
    await db.query('UPDATE profiles SET goal = $2 WHERE account_id = $1', [accountId, goal]);
  }

  async save(profile: Profile): Promise<void> {
    const result = await getPostgresPool().query(
      `UPDATE profiles
       SET name = $2, birth_date = $3, gender = $4, height = $5, weight = $6
       WHERE account_id = $1`,
      [
        profile.accountId,
        profile.name,
        profile.birthDate.toISOString().slice(0, 10),
        profile.gender,
        profile.height,
        profile.weight,
      ],
    );
    if (result.rowCount === 0) {
      throw new ResourceNotFound('Profile not found.');
    }
  }
}
