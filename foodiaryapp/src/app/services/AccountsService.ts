import { Gender } from '@app/types/Gender';
import { Goal } from '@app/types/Goal';
import { env } from '@app/config/env';
import { Service } from './Service';

export class AccountsService extends Service {
  static async getMe(): Promise<AccountsService.GetMeResponse> {
    const { data } = await this.client.get<AccountsService.GetMeApiResponse>(
      '/me',
      { timeout: 15_000 },
    );

    return {
      ...data,
      profile: {
        ...data.profile,
        birthDate: parseBirthDate(data.profile.birthDate),
        photoUrl: data.profile.photoUrl?.startsWith('/')
          ? `${env.api.url.replace(/\/$/, '')}${data.profile.photoUrl}`
          : data.profile.photoUrl,
      },
    };
  }
}

function parseBirthDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export namespace AccountsService {
  export type GetMeApiResponse = {
    profile: Omit<GetMeResponse['profile'], 'birthDate'> & { birthDate: string };
    goal: GetMeResponse['goal'];
  };

  export type GetMeResponse = {
    profile: {
      name: string;
      birthDate: Date;
      gender: Gender;
      height: number;
      weight: number;
      goal: Goal;
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
