import { Account } from '@application/entities/Account';
import { Injectable } from '@kernel/decorators/Injectable';
import { getPostgresPool } from '../pool';

type AccountRow = {
  id: string;
  email: string;
  external_id: string | null;
  created_at: Date;
};

@Injectable()
export class AccountRepository {
  async findByEmail(email: string): Promise<Account | null> {
    const { rows } = await getPostgresPool().query<AccountRow>(
      'SELECT id, email, external_id, created_at FROM accounts WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email],
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    return new Account({
      id: row.id,
      email: row.email,
      externalId: row.external_id ?? undefined,
      createdAt: row.created_at,
    });
  }
}
