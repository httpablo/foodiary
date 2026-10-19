import { Profile } from '@application/entities/Profile';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { BadRequest } from '@application/errors/http/BadRequest';
import { isValidBirthDate } from '@application/shared/birthDateSchema';
import { localDateFromOffset } from '@application/shared/localDate';
import { ProfileRepository } from '@infra/database/postgres/repositories/ProfileRepository';
import { WeightLogRepository } from '@infra/database/postgres/repositories/WeightLogRepository';
import { Injectable } from '@kernel/decorators/Injectable';
import { CheckWeightGoalAchievementUseCase } from '../weightGoals/CheckWeightGoalAchievementUseCase';

@Injectable([ProfileRepository, WeightLogRepository, CheckWeightGoalAchievementUseCase])
export class UpdateProfileUseCase {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly weightLogRepository: WeightLogRepository,
    private readonly checkWeightGoalAchievementUseCase: CheckWeightGoalAchievementUseCase,
  ) {}

  async execute({
    accountId,
    name,
    birthDate,
    gender,
    height,
    weight,
    timezoneOffsetMinutes = 0,
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

    const current = await this.profileRepository.findByAccountId(accountId);

    if (!current) {
      throw new ResourceNotFound('Profile not found.');
    }

    await this.profileRepository.save(new Profile({
      accountId,
      name: name.trim(),
      birthDate,
      gender,
      height,
      weight,
      activityLevel: current.activityLevel,
      goal: current.goal,
    }));

    await this.weightLogRepository.upsert({
      accountId,
      weight,
      date: localDateFromOffset(timezoneOffsetMinutes),
    });

    await this.checkWeightGoalAchievementUseCase.execute({ accountId });
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
    timezoneOffsetMinutes?: number;
  };

  export type Output = void;
}
