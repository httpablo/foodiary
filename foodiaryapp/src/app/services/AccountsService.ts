import { Gender } from '@app/types/Gender';
import { Goal } from '@app/types/Goal';
import { env } from '@app/config/env';
import { Service } from './Service';

export class AccountsService extends Service {
  static async getMe(): Promise<AccountsService.GetMeResponse> {
    const { data } = await this.client.get<AccountsService.GetMeResponse>(
      '/me',
    );

    return {
      ...data,
      profile: {
        ...data.profile,
        birthDate: new Date(data.profile.birthDate),
        photoUrl: data.profile.photoUrl?.startsWith('/')
          ? `${env.api.url.replace(/\/$/, '')}${data.profile.photoUrl}`
          : data.profile.photoUrl,
      },
    };
  }
}

export namespace AccountsService {
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
