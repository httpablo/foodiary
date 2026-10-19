import { Goal } from '@application/entities/Goal';
import { Profile } from '@application/entities/Profile';
import { WeightGoal } from '@application/entities/WeightGoal';
import { Injectable } from '@kernel/decorators/Injectable';
import { getPostgresPool } from '../pool';
import { GoalRepository } from '../repositories/GoalRepository';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { WeightGoalRepository } from '../repositories/WeightGoalRepository';

@Injectable([WeightGoalRepository, ProfileRepository, GoalRepository])
export class WeightGoalUnitOfWork {
  constructor(
    private readonly weightGoalRepository: WeightGoalRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly goalRepository: GoalRepository,
  ) {}

  // Replaces the current goal (abandon/acknowledge + insert) atomically.
  async start({ accountId, weightGoal, dailyGoal }: WeightGoalUnitOfWork.StartParams): Promise<void> {
    await this.run(async (client) => {
      await this.weightGoalRepository.closeCurrent(accountId, client);
      await this.weightGoalRepository.insert(weightGoal, client);
      await this.profileRepository.setGoal(accountId, Profile.Goal[weightGoal.direction], client);

      if (dailyGoal) {
        await this.goalRepository.save(dailyGoal, client);
      }
    });
  }

  async end({ accountId, dailyGoal }: WeightGoalUnitOfWork.EndParams): Promise<void> {
    await this.run(async (client) => {
      await this.weightGoalRepository.closeCurrent(accountId, client);
      await this.profileRepository.setGoal(accountId, Profile.Goal.MAINTAIN, client);

      if (dailyGoal) {
        await this.goalRepository.save(dailyGoal, client);
      }
    });
  }

  private async run(work: (client: Parameters<GoalRepository['save']>[1]) => Promise<void>): Promise<void> {
    const client = await getPostgresPool().connect();

    try {
      await client.query('BEGIN');
      await work(client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export namespace WeightGoalUnitOfWork {
  export type StartParams = {
    accountId: string;
    weightGoal: WeightGoal;
    dailyGoal?: Goal;
  };

  export type EndParams = {
    accountId: string;
    dailyGoal?: Goal;
  };
}
