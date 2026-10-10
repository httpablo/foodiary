import 'dotenv/config';

import { createHttpServer } from './server';
import { LocalMealWorker } from './LocalMealWorker';
import { LocalMealQueueRepository } from '@infra/database/postgres/repositories/LocalMealQueueRepository';
import { ProcessMealUseCase } from '@application/usecases/meals/ProcessMealUseCase';
import { Registry } from '@kernel/di/Registry';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3005);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

createHttpServer().listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.info(`Foodiary API listening on http://${host}:${port}`);
  if (process.env.OPENAI_API_KEY) {
    const registry = Registry.getInstance();
    new LocalMealWorker(
      registry.resolve(LocalMealQueueRepository),
      registry.resolve(ProcessMealUseCase),
    ).start();
  } else {
    // eslint-disable-next-line no-console
    console.warn('Meal worker is paused until OPENAI_API_KEY is configured.');
  }
});
