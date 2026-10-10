import { InvalidCredentials } from '@application/errors/application/InvalidCredentials';
import { InvalidRefreshToken } from '@application/errors/application/InvalidRefreshToken';
import { BadRequest } from '@application/errors/http/BadRequest';
import { getPostgresPool } from '@infra/database/postgres/pool';
import { Injectable } from '@kernel/decorators/Injectable';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { hashPassword, verifyPassword } from './password';

const issuer = 'foodiary';
const audience = 'foodiary-app';
const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const resetLifetimeMs = 15 * 60 * 1000;

type AccountAuthRow = { id: string; password_hash: string | null };

function signingKey(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;

  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('AUTH_JWT_SECRET must contain at least 32 bytes.');
  }

  return new TextEncoder().encode(secret);
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function resetCodeHash(code: string): string {
  return createHmac('sha256', signingKey()).update(code).digest('hex');
}

@Injectable()
export class LocalAuthGateway {
  async signIn({ email, password }: LocalAuthGateway.SignInParams): Promise<LocalAuthGateway.Tokens> {
    const { rows } = await getPostgresPool().query<AccountAuthRow>(
      'SELECT id, password_hash FROM accounts WHERE LOWER(email) = LOWER($1)',
      [email],
    );
    const account = rows[0];

    if (!account?.password_hash) {
      await hashPassword(password);
      throw new InvalidCredentials();
    }

    if (!await verifyPassword(password, account.password_hash)) {
      throw new InvalidCredentials();
    }

    return this.issueTokens(account.id);
  }

  async issueTokens(accountId: string): Promise<LocalAuthGateway.Tokens> {
    const key = signingKey();
    const refreshToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + refreshLifetimeMs);

    await getPostgresPool().query(
      'INSERT INTO auth_refresh_tokens (token_hash, account_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash(refreshToken), accountId, expiresAt],
    );

    return {
      accessToken: await this.signAccessToken(accountId, key),
      refreshToken,
    };
  }

  async refreshToken({ refreshToken }: LocalAuthGateway.RefreshTokenParams): Promise<LocalAuthGateway.Tokens> {
    const key = signingKey();
    const nextRefreshToken = randomBytes(32).toString('base64url');
    const { rows } = await getPostgresPool().query<{ account_id: string }>(
      `UPDATE auth_refresh_tokens
       SET token_hash = $2, expires_at = $3
       WHERE token_hash = $1 AND expires_at > NOW()
       RETURNING account_id`,
      [tokenHash(refreshToken), tokenHash(nextRefreshToken), new Date(Date.now() + refreshLifetimeMs)],
    );
    const accountId = rows[0]?.account_id;

    if (!accountId) {
      throw new InvalidRefreshToken();
    }

    return {
      accessToken: await this.signAccessToken(accountId, key),
      refreshToken: nextRefreshToken,
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await getPostgresPool().query(
      'DELETE FROM auth_refresh_tokens WHERE token_hash = $1',
      [tokenHash(refreshToken)],
    );
  }

  async verifyAccessToken(accessToken: string): Promise<string> {
    const { payload } = await jwtVerify(accessToken, signingKey(), {
      algorithms: ['HS256'],
      issuer,
      audience,
    });

    if (!payload.sub) {
      throw new InvalidCredentials();
    }

    return payload.sub;
  }

  async forgotPassword({ email }: LocalAuthGateway.ForgotPasswordParams): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Password reset email delivery is not configured.');
    }

    const { rows } = await getPostgresPool().query<{ id: string }>(
      'SELECT id FROM accounts WHERE LOWER(email) = LOWER($1)',
      [email],
    );
    const accountId = rows[0]?.id;

    if (!accountId) {
      return;
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await getPostgresPool().query(
      `INSERT INTO auth_password_resets (account_id, code_hash, expires_at, attempts)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (account_id)
       DO UPDATE SET code_hash = EXCLUDED.code_hash,
                     expires_at = EXCLUDED.expires_at,
                     attempts = 0`,
      [accountId, resetCodeHash(code), new Date(Date.now() + resetLifetimeMs)],
    );

    // Local development only. Never print reset codes in production.
    // eslint-disable-next-line no-console
    console.info(`Password reset code for ${email}: ${code}`);
  }

  async confirmForgotPassword({
    email,
    confirmationCode,
    password,
  }: LocalAuthGateway.ConfirmForgotPasswordParams): Promise<void> {
    const passwordHash = await hashPassword(password);
    const client = await getPostgresPool().connect();
    let valid = false;

    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{
        id: string;
        code_hash: string;
        expires_at: Date;
        attempts: number;
      }>(
        `SELECT a.id, r.code_hash, r.expires_at, r.attempts
         FROM accounts a
         JOIN auth_password_resets r ON r.account_id = a.id
         WHERE LOWER(a.email) = LOWER($1)
         FOR UPDATE OF r`,
        [email],
      );
      const reset = rows[0];

      if (reset && reset.expires_at > new Date() && reset.attempts < 5) {
        const expected = Buffer.from(reset.code_hash, 'hex');
        const actual = Buffer.from(resetCodeHash(confirmationCode), 'hex');

        if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
          await client.query('UPDATE accounts SET password_hash = $2 WHERE id = $1', [reset.id, passwordHash]);
          await client.query('DELETE FROM auth_refresh_tokens WHERE account_id = $1', [reset.id]);
          await client.query('DELETE FROM auth_password_resets WHERE account_id = $1', [reset.id]);
          valid = true;
        } else {
          await client.query('UPDATE auth_password_resets SET attempts = attempts + 1 WHERE account_id = $1', [reset.id]);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (!valid) {
      throw new BadRequest('Invalid or expired password reset code.');
    }
  }

  private async signAccessToken(accountId: string, key: Uint8Array): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(accountId)
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(key);
  }
}

export namespace LocalAuthGateway {
  export type Tokens = { accessToken: string; refreshToken: string };
  export type SignInParams = { email: string; password: string };
  export type RefreshTokenParams = { refreshToken: string };
  export type ForgotPasswordParams = { email: string };
  export type ConfirmForgotPasswordParams = {
    email: string;
    confirmationCode: string;
    password: string;
  };
}
