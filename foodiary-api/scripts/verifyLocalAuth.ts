import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';

import { ConfirmForgotPasswordController } from '@application/controllers/auth/ConfirmForgotPasswordController';
import { ForgotPasswordController } from '@application/controllers/auth/ForgotPasswordController';
import { RefreshTokenController } from '@application/controllers/auth/RefreshTokenController';
import { SignInController } from '@application/controllers/auth/SignInController';
import { SignUpController } from '@application/controllers/auth/SignUpController';
import { signInSchema } from '@application/controllers/auth/schemas/signInSchema';
import { Profile } from '@application/entities/Profile';
import { BadRequest } from '@application/errors/http/BadRequest';
import { ServiceUnavailable } from '@application/errors/http/ServiceUnavailable';
import { InvalidCredentials } from '@application/errors/application/InvalidCredentials';
import { InvalidRefreshToken } from '@application/errors/application/InvalidRefreshToken';
import { ConfirmForgotPasswordUseCase } from '@application/usecases/auth/ConfirmForgotPasswordUseCase';
import { ForgotPasswordUseCase } from '@application/usecases/auth/ForgotPasswordUseCase';
import { RefreshTokenUseCase } from '@application/usecases/auth/RefreshTokenUseCase';
import { SignInUseCase } from '@application/usecases/auth/SignInUseCase';
import { SignUpUseCase } from '@application/usecases/auth/SignUpUseCase';
import { LocalAuthGateway } from '@infra/auth/LocalAuthGateway';
import { getPostgresPool } from '@infra/database/postgres/pool';
import { AccountRepository } from '@infra/database/postgres/repositories/AccountRepository';
import { SignUpUnitOfWork } from '@infra/database/postgres/uow/SignUpUnitOfWork';
import { Registry } from '@kernel/di/Registry';

async function main() {
  const email = `auth-check-${Date.now()}@example.test`;
  const firstPassword = ' original-password-123 ';
  const nextPassword = 'updated-password-456';
  const gateway = new LocalAuthGateway();
  const pool = getPostgresPool();
  const originalInfo = console.info;

  try {
    const registry = Registry.getInstance();
    for (const controller of [
      SignUpController,
      SignInController,
      RefreshTokenController,
      ForgotPasswordController,
      ConfirmForgotPasswordController,
    ]) {
      assert.ok(registry.resolve(controller));
    }

    const signUpUseCase = new SignUpUseCase(
      gateway,
      new AccountRepository(),
      new SignUpUnitOfWork(),
    );

    await assert.rejects(
      signUpUseCase.execute({
        account: { email, password: firstPassword },
        profile: {
          name: 'Auth Test',
          birthDate: new Date('0000-01-01T00:00:00.000Z'),
          gender: Profile.Gender.FEMALE,
          height: 170,
          weight: 65,
          activityLevel: Profile.ActivityLevel.LIGHT,
          goal: Profile.Goal.MAINTAIN,
        },
      }),
      BadRequest,
    );
    await assert.rejects(
      signUpUseCase.execute({
        account: { email, password: firstPassword },
        profile: {
          name: 'Auth Test',
          birthDate: new Date('2099-01-01T00:00:00.000Z'),
          gender: Profile.Gender.FEMALE,
          height: 170,
          weight: 65,
          activityLevel: Profile.ActivityLevel.LIGHT,
          goal: Profile.Goal.MAINTAIN,
        },
      }),
      BadRequest,
    );

    const signupTokens = await signUpUseCase.execute({
      account: { email, password: firstPassword },
      profile: {
        name: 'Auth Test',
        birthDate: new Date('2000-01-01T00:00:00.000Z'),
        gender: Profile.Gender.FEMALE,
        height: 170,
        weight: 65,
        activityLevel: Profile.ActivityLevel.LIGHT,
        goal: Profile.Goal.MAINTAIN,
      },
    });
    const account = await new AccountRepository().findByEmail(email);
    assert.ok(account);
    assert.equal(await gateway.verifyAccessToken(signupTokens.accessToken), account.id);

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await assert.rejects(new ForgotPasswordUseCase(gateway).execute({ email }), ServiceUnavailable);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    const signIn = new SignInUseCase(gateway);
    await assert.rejects(signIn.execute({ email, password: 'wrong-password' }), InvalidCredentials);
    await assert.rejects(signIn.execute({ email, password: firstPassword.trim() }), InvalidCredentials);
    const paddedPayload = { email: ` \t${email.toUpperCase()}\n`, password: firstPassword };
    assert.deepEqual(signInSchema.parse(paddedPayload), { email, password: firstPassword });
    for (const invalidEmail of ['', ' ', 'bad', 'a b@example.test']) {
      assert.equal(signInSchema.safeParse({ email: invalidEmail, password: firstPassword }).success, false);
    }
    const controllerResponse = await new SignInController(signIn).execute({
      body: paddedPayload, accountId: null, params: {}, queryParams: {},
    });
    assert.equal(controllerResponse.statusCode, 200);
    assert.ok(controllerResponse.body);
    assert.equal(await gateway.verifyAccessToken(controllerResponse.body.accessToken), account.id);
    const signInTokens = await signIn.execute({ email: email.toUpperCase(), password: firstPassword });
    assert.equal(await gateway.verifyAccessToken(signInTokens.accessToken), account.id);

    const refresh = new RefreshTokenUseCase(gateway);
    const rotated = await refresh.execute({ refreshToken: signInTokens.refreshToken });
    assert.notEqual(rotated.refreshToken, signInTokens.refreshToken);
    await assert.rejects(refresh.execute({ refreshToken: signInTokens.refreshToken }), InvalidRefreshToken);
    assert.equal(await gateway.verifyAccessToken(rotated.accessToken), account.id);

    let confirmationCode: string | undefined;
    console.info = (message: unknown) => {
      const match = String(message).match(/: (\d{6})$/);
      confirmationCode = match?.[1];
    };
    await new ForgotPasswordUseCase(gateway).execute({ email });
    assert.ok(confirmationCode);

    const confirm = new ConfirmForgotPasswordUseCase(gateway);
    await assert.rejects(confirm.execute({ email, confirmationCode: '0000000', password: nextPassword }));
    await confirm.execute({ email, confirmationCode, password: nextPassword });
    await assert.rejects(signIn.execute({ email, password: firstPassword }), InvalidCredentials);
    await assert.rejects(refresh.execute({ refreshToken: rotated.refreshToken }), InvalidRefreshToken);
    const newTokens = await signIn.execute({ email, password: nextPassword });
    assert.equal(await gateway.verifyAccessToken(newTokens.accessToken), account.id);

    // eslint-disable-next-line no-console
    console.log('Local authentication, padded/case-insensitive email, exact passwords, refresh rotation, and password reset: OK');
  } finally {
    console.info = originalInfo;
    await pool.query('DELETE FROM accounts WHERE email = $1', [email]);
    await pool.end();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
