import 'dotenv/config';
import 'reflect-metadata';

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import KSUID from 'ksuid';

import { Meal } from '@application/entities/Meal';
import { ProcessMealUseCase } from '@application/usecases/meals/ProcessMealUseCase';
import { MealsAIGateway } from '@infra/ai/gateways/MealsAIGateway';
import { getPostgresPool } from '@infra/database/postgres/pool';
import { LocalMealQueueRepository } from '@infra/database/postgres/repositories/LocalMealQueueRepository';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { LocalMealsFileStorageGateway } from '@infra/gateways/LocalMealsFileStorageGateway';
import { Registry } from '@kernel/di/Registry';

async function main() {
  const mealsDirectory = await mkdtemp(path.join(tmpdir(), 'foodiary-queue-meals-'));
  process.env.LOCAL_MEALS_DIR = mealsDirectory;
  const pool = getPostgresPool();
  const accountId = KSUID.randomSync().string;
  const meals = new MealRepository();
  const queue = new LocalMealQueueRepository(meals);
  const storage = new LocalMealsFileStorageGateway();
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
    await storage.write(first.inputFileKey!, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    await storage.write(second.inputFileKey!, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    await meals.create(first);
    await meals.create(second);

    const [claimedA, claimedB] = await Promise.all([
      queue.claimNext(accountId), queue.claimNext(accountId),
    ]);
    assert.ok(claimedA && claimedB);
    assert.notEqual(claimedA.id, claimedB.id);
    assert.equal(claimedA.attempts, 1);
    assert.equal(await queue.claimNext(accountId), null);

    // API-004: calories returned by AI (999) is normalized deterministically to 165 (4*10 + 4*20 + 9*5)
    const normalizingAI = new MealsAIGateway(storage);
    (normalizingAI as unknown as { client: unknown }).client = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  name: 'Almoço',
                  icon: '🍽️',
                  foods: [{ name: 'Frango', quantity: '100g', calories: 999, proteins: 10, carbohydrates: 20, fats: 5 }],
                }),
              },
            }],
          }),
        },
      },
    };
    await new ProcessMealUseCase(meals, normalizingAI, queue).processClaimed(claimedA);
    const processedA = await meals.findById({ accountId, mealId: claimedA.id });
    assert.equal(processedA?.status, Meal.Status.SUCCESS);
    assert.equal(processedA?.foods[0]?.calories, 165);

    // API-003: negative nutrients or empty meal name must be rejected by MealsAIGateway and trigger retry/FAILED
    const negativeNutrientAI = new MealsAIGateway(storage);
    (negativeNutrientAI as unknown as { client: unknown }).client = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  name: 'Jantar',
                  icon: '🍽️',
                  foods: [{ name: 'Arroz', quantity: '100g', calories: 100, proteins: -10, carbohydrates: 20, fats: 5 }],
                }),
              },
            }],
          }),
        },
      },
    };
    await assert.rejects(
      new ProcessMealUseCase(meals, negativeNutrientAI, queue).processClaimed(claimedB),
      /Invalid analysis returned for meal/,
    );
    assert.equal((await meals.findById({ accountId, mealId: claimedB.id }))?.status, Meal.Status.QUEUED);
    assert.equal(await queue.claimNext(accountId), null);

    const emptyNameAI = new MealsAIGateway(storage);
    (emptyNameAI as unknown as { client: unknown }).client = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  name: '   ',
                  icon: '🍽️',
                  foods: [{ name: 'Arroz', quantity: '100g', calories: 100, proteins: 10, carbohydrates: 20, fats: 5 }],
                }),
              },
            }],
          }),
        },
      },
    };
    await pool.query('UPDATE meals SET available_at = NOW() WHERE id = $1', [claimedB.id]);
    const retried = await queue.claimById(accountId, claimedB.id);
    assert.equal(retried?.attempts, 2);
    await assert.rejects(
      new ProcessMealUseCase(meals, emptyNameAI, queue).processClaimed(retried!),
      /Invalid analysis returned for meal/,
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
    await rm(mealsDirectory, { recursive: true, force: true });
  }
}

main().catch(error => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
