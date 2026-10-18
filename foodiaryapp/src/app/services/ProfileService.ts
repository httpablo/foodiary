import { Gender } from '@app/types/Gender';
import { Service } from './Service';

export class ProfileService extends Service {
  static async updateProfilePhoto(uri: string): Promise<void> {
    const form = new FormData();
    await this.appendFileToFormData(form, {
      uri,
      name: 'profile.jpeg',
      type: 'image/jpeg',
    });
    await this.client.put('/profile-photo', form, {
      headers: { 'Content-Type': false },
    });
  }

  static async updateProfile(payload: ProfileService.UpdateProfilePayload): Promise<void> {
    await this.client.put('/profiles', payload);
  }
}

export namespace ProfileService {
  export type UpdateProfilePayload = {
    name: string;
    birthDate: string;
    height: number;
    weight: number;
    gender: Gender;
  };
}
