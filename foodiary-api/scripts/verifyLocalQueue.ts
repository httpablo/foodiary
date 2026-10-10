import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import KSUID from 'ksuid';

import { Meal } from '@application/entities/Meal';
import { ProcessMealUseCase } from '@application/usecases/meals/ProcessMealUseCase';
import { MealsAIGateway } from '@infra/ai/gateways/MealsAIGateway';
import { getPostgresPool } from '@infra/database/postgres/pool';
import { LocalMealQueueRepository } from '@infra/database/postgres/repositories/LocalMealQueueRepository';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { Registry } from '@kernel/di/Registry';

async function main() {
  const pool = getPostgresPool();
  const accountId = KSUID.randomSync().string;
  const meals = new MealRepository();
  const queue = new LocalMealQueueRepository(meals);
  assert.ok(Registry.getInstance().resolve(ProcessMealUseCase));
  const makeMeal = () => new Meal({
    accountId,
    status: Meal.Status.QUEUED,
    inputType: Meal.InputType.PICTURE,
    inputFileKey: `${accountId}/${KSUID.randomSync().string}.jpeg`,
  });

  await pool.query('INSERT INTO accounts (id, email) VALUES ($1, $2)', [accountId, `${accountId}@example.test`]);
  try {
    const first = makeMeal();
    const second = makeMeal();
    await meals.create(first);
    await meals.create(second);

    const [claimedA, claimedB] = await Promise.all([
      queue.claimNext(accountId), queue.claimNext(accountId),
    ]);
    assert.ok(claimedA && claimedB);
    assert.notEqual(claimedA.id, claimedB.id);
    assert.equal(claimedA.attempts, 1);
    assert.equal(await queue.claimNext(accountId), null);

    const fakeAI = {
      processMeal: async () => ({ name: 'Almoço', icon: '🍽️', foods: [] }),
    } as unknown as MealsAIGateway;
    await new ProcessMealUseCase(meals, fakeAI, queue).processClaimed(claimedA);
    assert.equal((await meals.findById({ accountId, mealId: claimedA.id }))?.status, Meal.Status.SUCCESS);

    const failingAI = {
      processMeal: async () => { throw new Error('Simulated AI failure'); },
    } as unknown as MealsAIGateway;
    await assert.rejects(
      new ProcessMealUseCase(meals, failingAI, queue).processClaimed(claimedB),
      /Simulated AI failure/,
    );
    assert.equal((await meals.findById({ accountId, mealId: claimedB.id }))?.status, Meal.Status.QUEUED);
    assert.equal(await queue.claimNext(accountId), null);

    await pool.query('UPDATE meals SET available_at = NOW() WHERE id = $1', [claimedB.id]);
    const retried = await queue.claimById(accountId, claimedB.id);
    assert.equal(retried?.attempts, 2);
    await assert.rejects(
      new ProcessMealUseCase(meals, failingAI, queue).processClaimed(retried!),
      /Simulated AI failure/,
    );
    assert.equal((await meals.findById({ accountId, mealId: claimedB.id }))?.status, Meal.Status.FAILED);

    const interrupted = makeMeal();
    await meals.create(interrupted);
    await pool.query(
      `UPDATE meals SET status = 'PROCESSING', attempts = 1,
         processing_started_at = NOW() - INTERVAL '16 minutes' WHERE id = $1`,
      [interrupted.id],
    );
    await queue.recoverExpired(accountId);
    assert.equal((await meals.findById({ accountId, mealId: interrupted.id }))?.status, Meal.Status.QUEUED);
    assert.equal((await queue.claimNext(accountId))?.id, interrupted.id);

    // eslint-disable-next-line no-console
    console.log('PostgreSQL meal queue, retries, and interrupted-job recovery: OK');
  } finally {
    await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
    await pool.end();
  }
}

main().catch(error => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
