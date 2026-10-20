import { Achievement } from '@application/entities/Achievement';
import { Meal } from '@application/entities/Meal';
import { Injectable } from '@kernel/decorators/Injectable';
import { getPostgresPool } from '../pool';

type AchievementRow = {
  code: Achievement.Code;
  unlocked_at: Date;
  acknowledged_at: Date | null;
};

type FactsRow = {
  meal_count: number;
  has_picture_meal: boolean;
  has_audio_meal: boolean;
  has_saved_food: boolean;
  weight_goal_reached: boolean;
  weight_log_dates: string[];
};

@Injectable()
export class AchievementRepository {
  async list(accountId: string): Promise<Achievement.Unlocked[]> {
    const { rows } = await getPostgresPool().query<AchievementRow>(
      `SELECT code, unlocked_at, acknowledged_at FROM achievements
       WHERE account_id = $1
       ORDER BY unlocked_at, code`,
      [accountId],
    );
    return rows.map(row => ({
      code: row.code,
      unlockedAt: row.unlocked_at.toISOString(),
      acknowledgedAt: row.acknowledged_at?.toISOString() ?? null,
    }));
  }

  async unlock(accountId: string, codes: Achievement.Code[]): Promise<void> {
    if (codes.length === 0) {
      return;
    }
    await getPostgresPool().query(
      `INSERT INTO achievements (account_id, code)
       SELECT $1, UNNEST($2::text[])
       ON CONFLICT (account_id, code) DO NOTHING`,
      [accountId, codes],
    );
  }

  async acknowledge(accountId: string, codes: Achievement.Code[]): Promise<void> {
    await getPostgresPool().query(
      `UPDATE achievements SET acknowledged_at = NOW()
       WHERE account_id = $1 AND code = ANY($2::text[]) AND acknowledged_at IS NULL`,
      [accountId, codes],
    );
  }

  async loadFacts(accountId: string): Promise<AchievementRepository.Facts> {
    const { rows } = await getPostgresPool().query<FactsRow>(
      `SELECT
         (SELECT COUNT(*)::int FROM meals WHERE account_id = $1 AND status = $2) AS meal_count,
         EXISTS (SELECT 1 FROM meals WHERE account_id = $1 AND status = $2 AND input_type = $3) AS has_picture_meal,
         EXISTS (SELECT 1 FROM meals WHERE account_id = $1 AND status = $2 AND input_type = $4) AS has_audio_meal,
         EXISTS (SELECT 1 FROM saved_foods WHERE account_id = $1) AS has_saved_food,
         EXISTS (SELECT 1 FROM weight_goals WHERE account_id = $1 AND status = 'ACHIEVED') AS weight_goal_reached,
         ARRAY(SELECT date::text FROM weight_logs WHERE account_id = $1 ORDER BY date) AS weight_log_dates`,
      [accountId, Meal.Status.SUCCESS, Meal.InputType.PICTURE, Meal.InputType.AUDIO],
    );
    const row = rows[0]!;
    return {
      mealCount: row.meal_count,
      hasPictureMeal: row.has_picture_meal,
      hasAudioMeal: row.has_audio_meal,
      hasSavedFood: row.has_saved_food,
      weightGoalReached: row.weight_goal_reached,
      weightLogDates: row.weight_log_dates,
    };
  }
}

export namespace AchievementRepository {
  export type Facts = {
    mealCount: number;
    hasPictureMeal: boolean;
    hasAudioMeal: boolean;
    hasSavedFood: boolean;
    weightGoalReached: boolean;
    weightLogDates: string[];
  };
}
