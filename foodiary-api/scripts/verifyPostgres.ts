import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { Account } from '@application/entities/Account';
import { Goal } from '@application/entities/Goal';
import { Meal } from '@application/entities/Meal';
import { Profile } from '@application/entities/Profile';
import { WeightGoal } from '@application/entities/WeightGoal';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { WeightGoalCalculator } from '@application/services/WeightGoalCalculator';
import { addDays, diffInDays, localDateFromOffset } from '@application/shared/localDate';
import { BadRequest } from '@application/errors/http/BadRequest';
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
import { WeightLogRepository } from '@infra/database/postgres/repositories/WeightLogRepository';
import { WeightGoalRepository } from '@infra/database/postgres/repositories/WeightGoalRepository';
import { SignUpUnitOfWork } from '@infra/database/postgres/uow/SignUpUnitOfWork';
import { WeightGoalUnitOfWork } from '@infra/database/postgres/uow/WeightGoalUnitOfWork';

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
  const weightLogsMigrationSql = await readFile(path.resolve(process.cwd(), 'db/008_weight_logs.sql'), 'utf8');
  await pool.query(weightLogsMigrationSql);
  const weightGoalsMigrationSql = await readFile(path.resolve(process.cwd(), 'db/009_weight_goals.sql'), 'utf8');
  await pool.query(weightGoalsMigrationSql);
  await pool.query(weightGoalsMigrationSql);

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
  assert.ok(GoalCalculator.calculate(lowCalorieProfile).calories >= 1200);

  // Pure calculation checks.
  assert.equal(GoalCalculator.calcAge(new Date('2000-06-15T00:00:00.000Z'), new Date('2026-06-14T12:00:00.000Z')), 25);
  assert.equal(GoalCalculator.calcAge(new Date('2000-06-15T00:00:00.000Z'), new Date('2026-06-15T12:00:00.000Z')), 26);
  assert.equal(GoalCalculator.calcAge(new Date('2000-06-15T00:00:00.000Z'), new Date('2026-01-01T12:00:00.000Z')), 25);
  const maintainProfile = new Profile({ ...profile, accountId: 'pure', goal: Profile.Goal.MAINTAIN });
  const legacyLose = GoalCalculator.calculate(new Profile({ ...maintainProfile, goal: Profile.Goal.LOSE }));
  const paceLose = GoalCalculator.calculate(maintainProfile, { direction: WeightGoal.Direction.LOSE, paceKgPerWeek: 0.5 });
  assert.ok(paceLose.calories < GoalCalculator.calculate(maintainProfile).calories);
  assert.ok(Math.abs(paceLose.calories - GoalCalculator.calculate(maintainProfile).calories + 550) <= 10);
  assert.ok(legacyLose.calories < GoalCalculator.calculate(maintainProfile).calories);
  assert.deepEqual(WeightGoalCalculator.healthyRange(170), { min: 53.5, max: 72 });
  assert.deepEqual(
    WeightGoalCalculator.paceOptions(WeightGoal.Direction.LOSE, 80).map(option => option.paceKgPerWeek),
    [0.25, 0.5, 0.75],
  );
  assert.deepEqual(
    WeightGoalCalculator.paceOptions(WeightGoal.Direction.LOSE, 50).map(option => option.paceKgPerWeek),
    [0.25, 0.5, 0.5],
  );
  assert.deepEqual(
    WeightGoalCalculator.paceOptions(WeightGoal.Direction.GAIN, 40).map(option => option.paceKgPerWeek),
    [0.1, 0.2, 0.2],
  );
  assert.throws(
    () => WeightGoalCalculator.assertValidTarget({ currentWeight: 65, targetWeight: 50, heightCm: 170 }),
    BadRequest,
  );
  assert.throws(
    () => WeightGoalCalculator.assertValidTarget({ currentWeight: 65, targetWeight: 64.7, heightCm: 170 }),
    BadRequest,
  );
  assert.equal(addDays('2026-02-27', 3), '2026-03-02');
  assert.equal(diffInDays('2026-01-01', '2026-03-01'), 59);
  assert.equal(localDateFromOffset(180, Date.parse('2026-03-01T01:00:00.000Z')), '2026-02-28');
  assert.equal(localDateFromOffset(-180, Date.parse('2026-03-01T22:00:00.000Z')), '2026-03-02');
  const sampleGoal = new WeightGoal({
    accountId: 'pure', startWeight: 80, targetWeight: 70, startDate: '2026-01-01', paceKgPerWeek: 0.5,
  });
  const sampleLogs = [
    { date: '2026-01-01', weight: 80 },
    { date: '2026-01-08', weight: 79 },
    { date: '2026-01-15', weight: 78 },
  ];
  const sampleProgress = WeightGoalCalculator.progress(sampleGoal, 78, sampleLogs, '2026-01-15');
  assert.equal(sampleProgress.plannedDate, '2026-05-21');
  assert.equal(sampleProgress.weeklyRateKg, 1);
  assert.equal(sampleProgress.projectedDate, '2026-03-12');
  assert.equal(sampleProgress.trackStatus, 'AHEAD');
  assert.equal(sampleProgress.percent, 20);
  assert.equal(
    WeightGoalCalculator.progress(sampleGoal, 80, [{ date: '2026-01-15', weight: 80 }], '2026-01-15').trackStatus,
    'NOT_ENOUGH_DATA',
  );
  assert.equal(
    WeightGoalCalculator.progress(sampleGoal, 81, [
      { date: '2026-01-01', weight: 80 }, { date: '2026-01-15', weight: 81 },
    ], '2026-01-15').trackStatus,
    'OFF_TRACK',
  );
  assert.equal(
    WeightGoalCalculator.progress(sampleGoal, 79, [
      { date: '2025-12-01', weight: 84 }, { date: '2025-12-20', weight: 81 }, { date: '2026-01-01', weight: 79 },
    ], '2026-01-01').trackStatus,
    'NOT_ENOUGH_DATA',
  );

  try {
    const passwordHash = await hashPassword('test-password-123');
    await new SignUpUnitOfWork().run({ account, profile, goal, passwordHash });

    assert.equal((await new AccountRepository().findByEmail(account.email.toUpperCase()))?.id, id);
    assert.equal((await new ProfileRepository().findByAccountId(id))?.name, 'Test');
    assert.equal((await new GoalRepository().findByAccountId(id))?.calories, 2000);

    const weightLogsRepo = new WeightLogRepository();
    const initialLogs = await weightLogsRepo.list(id);
    assert.equal(initialLogs.length, 1);
    assert.equal(initialLogs[0].weight, 65);
    await weightLogsRepo.upsert({ accountId: id, weight: 64.2, date: initialLogs[0].date });
    assert.equal((await new ProfileRepository().findByAccountId(id))?.weight, 64.2);

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

    // Weight goals and daily goal source.
    const today = localDateFromOffset(0);
    const goalsRepo = new GoalRepository();
    const profilesRepo = new ProfileRepository();
    const weightGoalsRepo = new WeightGoalRepository();
    const unitOfWork = new WeightGoalUnitOfWork(weightGoalsRepo, profilesRepo, goalsRepo);
    const storedGoal = await goalsRepo.findByAccountId(id);
    assert.equal(storedGoal?.source, Goal.Source.CALCULATED);
    assert.equal(storedGoal?.calculatedForWeight, 65);

    const firstGoal = new WeightGoal({
      accountId: id, startWeight: 65, targetWeight: 60, startDate: today, paceKgPerWeek: 0.5,
    });
    await unitOfWork.start({
      accountId: id,
      weightGoal: firstGoal,
      dailyGoal: new Goal({ accountId: id, calories: 1800, proteins: 120, carbohydrates: 180, fats: 50, calculatedForWeight: 65 }),
    });
    assert.equal((await profilesRepo.findByAccountId(id))?.goal, Profile.Goal.LOSE);
    assert.equal((await goalsRepo.findByAccountId(id))?.calories, 1800);
    assert.equal((await weightGoalsRepo.findActive(id))?.id, firstGoal.id);

    // A second ACTIVE goal is rejected by the partial unique index and rolled back.
    const secondGoal = new WeightGoal({
      accountId: id, startWeight: 65, targetWeight: 70, startDate: today, paceKgPerWeek: 0.25,
    });
    await assert.rejects(weightGoalsRepo.insert(secondGoal));
    assert.equal((await weightGoalsRepo.findActive(id))?.id, firstGoal.id);

    // Replacing the goal abandons the previous one in the same transaction.
    await unitOfWork.start({ accountId: id, weightGoal: secondGoal });
    assert.equal((await profilesRepo.findByAccountId(id))?.goal, Profile.Goal.GAIN);
    assert.equal((await goalsRepo.findByAccountId(id))?.calories, 1800);
    const statuses = await pool.query<{ id: string; status: string }>(
      'SELECT id, status FROM weight_goals WHERE account_id = $1', [id],
    );
    assert.equal(statuses.rows.find(row => row.id === firstGoal.id)?.status, 'ABANDONED');
    assert.equal(statuses.rows.find(row => row.id === secondGoal.id)?.status, 'ACTIVE');

    assert.equal(await weightGoalsRepo.markAchievedIfReached(id, 69.9), false);
    assert.equal(await weightGoalsRepo.markAchievedIfReached(id, 70), true);
    assert.equal(await weightGoalsRepo.markAchievedIfReached(id, 71), false);
    assert.equal((await profilesRepo.findByAccountId(id))?.goal, Profile.Goal.MAINTAIN);
    assert.equal(await weightGoalsRepo.findActive(id), null);
    assert.equal((await weightGoalsRepo.findCurrent(id))?.status, WeightGoal.Status.ACHIEVED);

    await unitOfWork.end({ accountId: id });
    assert.equal(await weightGoalsRepo.findCurrent(id), null);
    const acknowledged = await pool.query(
      'SELECT 1 FROM weight_goals WHERE id = $1 AND status = \'ACHIEVED\' AND acknowledged_at IS NOT NULL',
      [secondGoal.id],
    );
    assert.equal(acknowledged.rowCount, 1);

    await goalsRepo.save(new Goal({
      accountId: id, calories: 1500, proteins: 100, carbohydrates: 150, fats: 50, source: Goal.Source.MANUAL,
    }));
    const manualGoal = await goalsRepo.findByAccountId(id);
    assert.equal(manualGoal?.source, Goal.Source.MANUAL);
    assert.equal(manualGoal?.calculatedForWeight, 65);

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
     
    console.log('PostgreSQL repositories and signup transaction: OK');
  } finally {
    await pool.query('DELETE FROM accounts WHERE id = $1', [id]);
    await pool.end();
  }
}

main().catch((error) => {
   
  console.error(error);
  process.exitCode = 1;
});
