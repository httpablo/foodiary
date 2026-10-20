import { Achievement } from '@application/entities/Achievement';
import { AchievementRepository } from '@infra/database/postgres/repositories/AchievementRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([AchievementRepository])
export class AcknowledgeAchievementsUseCase {
  constructor(private readonly achievementRepository: AchievementRepository) {}

  async execute({ accountId, codes }: AcknowledgeAchievementsUseCase.Input): Promise<void> {
    await this.achievementRepository.acknowledge(accountId, codes);
  }
}

export namespace AcknowledgeAchievementsUseCase {
  export type Input = {
    accountId: string;
    codes: Achievement.Code[];
  };
}
