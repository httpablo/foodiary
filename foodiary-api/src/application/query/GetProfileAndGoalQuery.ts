import { Profile } from '@application/entities/Profile';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { getPostgresPool } from '@infra/database/postgres/pool';
import { LocalProfilePhotoStorageGateway } from '@infra/gateways/LocalProfilePhotoStorageGateway';
import { Injectable } from '@kernel/decorators/Injectable';

type ProfileAndGoalRow = {
  name: string;
  birth_date: string;
  gender: Profile.Gender;
  height: number;
  weight: number;
  profile_goal: Profile.Goal;
  photo_file_key: string | null;
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
};

@Injectable([LocalProfilePhotoStorageGateway])
export class GetProfileAndGoalQuery {
  constructor(private readonly photoStorage = new LocalProfilePhotoStorageGateway()) {}

  async execute({ accountId }: GetProfileAndGoalQuery.Input): Promise<GetProfileAndGoalQuery.Output> {
    const { rows } = await getPostgresPool().query<ProfileAndGoalRow>(
      `SELECT p.name, p.birth_date::text AS birth_date, p.gender, p.height,
              p.photo_file_key,
              p.weight, p.goal AS profile_goal, g.calories, g.proteins,
              g.carbohydrates, g.fats
       FROM profiles p
       JOIN goals g ON g.account_id = p.account_id
       WHERE p.account_id = $1`,
      [accountId],
    );
    const row = rows[0];

    if (!row) {
      throw new ResourceNotFound('Account not found.');
    }

    return {
      profile: {
        name: row.name,
        birthDate: new Date(`${row.birth_date}T00:00:00.000Z`).toISOString(),
        gender: row.gender,
        height: row.height,
        weight: row.weight,
        goal: row.profile_goal,
        photoUrl: row.photo_file_key ? this.photoStorage.getFileURL(row.photo_file_key) : null,
      },
      goal: {
        calories: row.calories,
        proteins: row.proteins,
        carbohydrates: row.carbohydrates,
        fats: row.fats,
      },
    };
  }
}

export namespace GetProfileAndGoalQuery {
  export type Input = { accountId: string };

  export type Output = {
    profile: {
      name: string;
      birthDate: string;
      gender: Profile.Gender;
      height: number;
      weight: number;
      goal: Profile.Goal;
      photoUrl: string | null;
    };
    goal: {
      calories: number;
      proteins: number;
      carbohydrates: number;
      fats: number;
    };
  };
}
