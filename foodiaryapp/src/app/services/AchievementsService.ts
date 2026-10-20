import { AchievementCode, UnlockedAchievement } from '@app/types/Achievement';
import { Service } from './Service';

export class AchievementsService extends Service {
  static async list(timezoneOffsetMinutes: number): Promise<UnlockedAchievement[]> {
    const { data } = await this.client.get<{ achievements: UnlockedAchievement[] }>('/achievements', {
      params: { timezoneOffsetMinutes },
    });
    return data.achievements;
  }

  static async acknowledge(codes: AchievementCode[]): Promise<void> {
    await this.client.post('/achievements/acknowledge', { codes });
  }
}
