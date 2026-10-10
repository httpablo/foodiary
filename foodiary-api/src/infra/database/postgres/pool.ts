import { Pool } from 'pg';

let pool: Pool | undefined;

export function getPostgresPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is required to connect to PostgreSQL.');
    }

    pool = new Pool({ connectionString, max: 10 });
  }

  return pool;
}
