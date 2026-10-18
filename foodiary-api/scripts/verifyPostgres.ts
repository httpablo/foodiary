import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { Account } from '@application/entities/Account';
import { Goal } from '@application/entities/Goal';
import { Meal } from '@application/entities/Meal';
import { Profile } from '@application/entities/Profile';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { EmailAlreadyInUse } from '@application/errors/application/EmailAlreadyInUse';
import { hashPassword } from '@infra/auth/password';
import { GetProfileAndGoalQuery } from '@application/query/GetProfileAndGoalQuery';
import { ListMealsByDayQuery } from '@application/query/ListMealsByDayQuery';
import { getPostgresPool } from '@infra/database/postgres/pool';
import { AccountRepository } from '@infra/database/postgres/repositories/AccountRepository';
import { GoalRepository } from '@infra/database/postgres/repositories/GoalRepository';
import { LocalMealQueueRepository } from '@infra/database/postgres/repositories/LocalMealQueueRepository';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { SignUpUnitOfWork } from '@infra/database/postgres/uow/SignUpUnitOfWork';

async function main() {
  const id = `postgres-check-${Date.now()}`;
  const account = new Account({ id, email: `${id}@example.test` });
  const profile = new Profile({
    accountId: id,
    name: 'Test',
    birthDate: new Date('2000-01-01T00:00:00.000Z'),
    gender: Profile.Gender.FEMALE,
    height: 170,
    weight: 65,
    activityLevel: Profile.ActivityLevel.LIGHT,
    goal: Profile.Goal.MAINTAIN,
  });
  const goal = new Goal({
    accountId: id,
    calories: 2000,
    proteins: 100,
    carbohydrates: 200,
    fats: 70,
  });
  const pool = getPostgresPool();
  const finiteMigrationSql = await readFile(path.resolve(process.cwd(), 'db/007_finite_checks.sql'), 'utf8');
  await pool.query(finiteMigrationSql);

  const lowCalorieProfile = new Profile({
    accountId: id,
    name: 'Low calorie case',
    birthDate: new Date('1950-01-01T00:00:00.000Z'),
    gender: Profile.Gender.FEMALE,
    height: 150,
    weight: 50,
    activityLevel: Profile.ActivityLevel.SEDENTARY,
    goal: Profile.Goal.LOSE,
  });
  assert.ok(GoalCalculator.calculate(lowCalorieProfile).carbohydrates >= 0);

  try {
    const passwordHash = await hashPassword('test-password-123');
    await new SignUpUnitOfWork().run({ account, profile, goal, passwordHash });

    assert.equal((await new AccountRepository().findByEmail(account.email.toUpperCase()))?.id, id);
    assert.equal((await new ProfileRepository().findByAccountId(id))?.name, 'Test');
    assert.equal((await new GoalRepository().findByAccountId(id))?.calories, 2000);

    profile.name = 'Updated';
    await new ProfileRepository().save(profile);
    goal.calories = 2100;
    await new GoalRepository().save(goal);

    await assert.rejects(
      pool.query('UPDATE goals SET calories = $2::float8 WHERE account_id = $1', [id, 'Infinity']),
    );
    await assert.rejects(
      pool.query('UPDATE profiles SET height = $2::float8 WHERE account_id = $1', [id, 'Infinity']),
    );

    const me = await new GetProfileAndGoalQuery().execute({ accountId: id });
    assert.equal(me.profile.name, 'Updated');
    assert.equal(me.profile.birthDate, '2000-01-01T00:00:00.000Z');
    assert.equal(me.goal.calories, 2100);

    const meal = new Meal({
      accountId: id,
      status: Meal.Status.UPLOADING,
      inputType: Meal.InputType.PICTURE,
      inputFileKey: `${id}/test.jpeg`,
    });
    const meals = new MealRepository();
    const queue = new LocalMealQueueRepository(meals);
    await meals.create(meal);
    assert.equal((await meals.findById({ accountId: id, mealId: meal.id }))?.status, Meal.Status.UPLOADING);

    assert.equal(await meals.markUploaded(meal), true);
    const claimed = await queue.claimById(id, meal.id);
    assert.ok(claimed);
    assert.equal(await queue.completeSuccess(claimed, {
      name: 'Lunch',
      icon: '🍽️',
      foods: [{ name: 'Rice', quantity: '100 g', calories: 124, proteins: 3, carbohydrates: 28, fats: 0 }],
    }), true);

    const day = await new ListMealsByDayQuery().execute({ accountId: id, date: meal.createdAt });
    assert.equal(day.meals.length, 1);
    assert.equal(day.meals[0].foods[0].name, 'Rice');

    const duplicate = new Account({ id: `${id}-duplicate`, email: account.email.toUpperCase() });
    await assert.rejects(
      new SignUpUnitOfWork().run({ account: duplicate, profile, goal, passwordHash }),
      EmailAlreadyInUse,
    );
    const { rowCount } = await pool.query('SELECT 1 FROM accounts WHERE id = $1', [duplicate.id]);
    assert.equal(rowCount, 0);

    // eslint-disable-next-line no-console
    console.log('PostgreSQL repositories and signup transaction: OK');
  } finally {
    await pool.query('DELETE FROM accounts WHERE id = $1', [id]);
    await pool.end();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
