import { Account } from '@application/entities/Account';
import { Goal } from '@application/entities/Goal';
import { Profile } from '@application/entities/Profile';
import { EmailAlreadyInUse } from '@application/errors/application/EmailAlreadyInUse';
import { Injectable } from '@kernel/decorators/Injectable';
import { getPostgresPool } from '../pool';

@Injectable()
export class SignUpUnitOfWork {
  async run({ account, goal, profile, passwordHash }: SignUpUnitOfWork.RunParams): Promise<void> {
    const client = await getPostgresPool().connect();

    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO accounts (id, email, external_id, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)',
        [account.id, account.email, account.externalId ?? null, passwordHash, account.createdAt],
      );
      await client.query(
        `INSERT INTO profiles
           (account_id, name, birth_date, gender, height, weight, initial_weight, activity_level, goal, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9)`,
        [
          profile.accountId,
          profile.name,
          profile.birthDate.toISOString().slice(0, 10),
          profile.gender,
          profile.height,
          profile.weight,
          profile.activityLevel,
          profile.goal,
          profile.createdAt,
        ],
      );
      await client.query(
        `INSERT INTO goals
           (account_id, calories, proteins, carbohydrates, fats, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          goal.accountId,
          goal.calories,
          goal.proteins,
          goal.carbohydrates,
          goal.fats,
          goal.createdAt,
        ],
      );
      await client.query(
        `INSERT INTO weight_logs
           (id, account_id, weight, date, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (account_id, date) DO UPDATE
         SET weight = EXCLUDED.weight, updated_at = EXCLUDED.updated_at`,
        [
          `init-${profile.accountId}`,
          profile.accountId,
          profile.weight,
          profile.createdAt.toISOString().slice(0, 10),
          profile.createdAt,
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');

      const databaseError = error as { code?: string; constraint?: string };
      if (databaseError.code === '23505' && databaseError.constraint === 'accounts_email_unique') {
        throw new EmailAlreadyInUse();
      }

      throw error;
    } finally {
      client.release();
    }
  }
}

export namespace SignUpUnitOfWork {
  export type RunParams = {
    account: Account;
    goal: Goal;
    profile: Profile;
    passwordHash: string;
  };
}
