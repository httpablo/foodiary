import { ProcessMealUseCase } from '@application/usecases/meals/ProcessMealUseCase';
import { LocalMealQueueRepository } from '@infra/database/postgres/repositories/LocalMealQueueRepository';

export class LocalMealWorker {
  private stopped = true;

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly queue: LocalMealQueueRepository,
    private readonly processor: ProcessMealUseCase,
  ) {}

  async runOnce(): Promise<boolean> {
    await this.queue.recoverExpired();
    const meal = await this.queue.claimNext();
    if (!meal) {
      return false;
    }

    try {
      await this.processor.processClaimed(meal);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to process meal ${meal.id}:`, error);
    }
    return true;
  }

  start(): void {
    if (!this.stopped) {
      return;
    }
    this.stopped = false;

    const tick = async () => {
      if (this.stopped) {
        return;
      }
      let processed = false;
      try {
        processed = await this.runOnce();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Meal worker error:', error);
      }
      if (!this.stopped) {
        this.timer = setTimeout(tick, processed ? 0 : 5000);
      }
    };

    void tick();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
}
