import { Profile } from '@application/entities/Profile';
import { BadRequest } from '@application/errors/http/BadRequest';
import { isValidBirthDate } from '@application/shared/birthDateSchema';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightLogRepository } from '@infra/database/postgres/repositories/WeightLogRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([ProfileRepository, WeightLogRepository])
export class UpdateProfileUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly weightLogRepository: WeightLogRepository = new WeightLogRepository(),
  ) {}

  async execute({
    accountId,
    name,
    birthDate,
    gender,
    height,
    weight,
  }: UpdateProfileUseCase.Input): Promise<UpdateProfileUseCase.Output> {
    if (!isValidBirthDate(birthDate)) {
      throw new BadRequest('Invalid birth date.');
    }

    if (
      !Number.isFinite(height) || height <= 0 || height > 300
      || !Number.isFinite(weight) || weight <= 0 || weight > 700
    ) {
      throw new BadRequest('Height and weight must be finite positive numbers within valid bounds.');
    }

    await this.profileRepository.save(new Profile({
      accountId,
      name: name.trim(),
      birthDate,
      gender,
      height,
      weight,
      activityLevel: Profile.ActivityLevel.LIGHT,
      goal: Profile.Goal.MAINTAIN,
    }));

    await this.weightLogRepository.upsert({
      accountId,
      weight,
      date: new Date().toISOString().slice(0, 10),
    });
  }
}

export namespace UpdateProfileUseCase {
  export type Input = {
    accountId: string;
    name: string;
    birthDate: Date;
    gender: Profile.Gender;
    height: number;
    weight: number;
  };

  export type Output = void;
}
