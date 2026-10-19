import { Account } from '@application/entities/Account';
import { Goal } from '@application/entities/Goal';
import { Profile } from '@application/entities/Profile';
import { WeightGoal } from '@application/entities/WeightGoal';
import { EmailAlreadyInUse } from '@application/errors/application/EmailAlreadyInUse';
import { BadRequest } from '@application/errors/http/BadRequest';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { WeightGoalCalculator } from '@application/services/WeightGoalCalculator';
import { isValidBirthDate } from '@application/shared/birthDateSchema';
import { localDateFromOffset } from '@application/shared/localDate';
import { AccountRepository } from '@infra/database/postgres/repositories/AccountRepository';
import { SignUpUnitOfWork } from '@infra/database/postgres/uow/SignUpUnitOfWork';
import { LocalAuthGateway } from '@infra/auth/LocalAuthGateway';
import { hashPassword } from '@infra/auth/password';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([LocalAuthGateway, AccountRepository, SignUpUnitOfWork])
export class SignUpUseCase {
  constructor(
    private readonly authGateway: LocalAuthGateway,
    private readonly accountRepository: AccountRepository,
    private readonly signUpUow: SignUpUnitOfWork,
  ) { }

  async execute({
    account: {
      email,
      password,
    },
    profile: { targetWeight, ...profileInfo },
    timezoneOffsetMinutes = 0,
  }: SignUpUseCase.Input): Promise<SignUpUseCase.Output> {
    this.authGateway.assertConfigured();

    if (!isValidBirthDate(profileInfo.birthDate)) {
      throw new BadRequest('Invalid birth date.');
    }

    if (
      !Number.isFinite(profileInfo.height) || profileInfo.height <= 0 || profileInfo.height > 300
      || !Number.isFinite(profileInfo.weight) || profileInfo.weight <= 0 || profileInfo.weight > 700
    ) {
      throw new BadRequest('Height and weight must be finite positive numbers within valid bounds.');
    }

    const emailAlreadyInUse = await this.accountRepository.findByEmail(email);

    if (emailAlreadyInUse) {
      throw new EmailAlreadyInUse();
    }

    const account = new Account({ email });
    let profile = new Profile({
      ...profileInfo,
      name: profileInfo.name.trim(),
      accountId: account.id,
    });

    let weightGoal: WeightGoal | undefined;

    if (targetWeight !== undefined) {
      WeightGoalCalculator.assertValidTarget({
        currentWeight: profile.weight,
        targetWeight,
        heightCm: profile.height,
      });

      const direction = WeightGoalCalculator.direction(profile.weight, targetWeight);
      const recommended = WeightGoalCalculator.paceOptions(direction, profile.weight)
        .find(option => option.key === WeightGoal.PaceKey.RECOMMENDED);

      weightGoal = new WeightGoal({
        accountId: account.id,
        startWeight: profile.weight,
        targetWeight: Number(targetWeight.toFixed(2)),
        startDate: localDateFromOffset(timezoneOffsetMinutes),
        paceKgPerWeek: recommended!.paceKgPerWeek,
      });
      profile = new Profile({ ...profile, goal: Profile.Goal[direction] });
    }

    const {
      calories,
      carbohydrates,
      fats,
      proteins,
    } = GoalCalculator.calculate(profile, weightGoal);

    const goal = new Goal({
      accountId: account.id,
      calories,
      carbohydrates,
      fats,
      proteins,
      calculatedForWeight: profile.weight,
    });

    const passwordHash = await hashPassword(password);

    await this.signUpUow.run({
      account,
      goal,
      profile,
      passwordHash,
      weightGoal,
      initialLogDate: localDateFromOffset(timezoneOffsetMinutes),
    });

    const { accessToken, refreshToken } = await this.authGateway.issueTokens(account.id);

    return { accessToken, refreshToken };
  }
}

export namespace SignUpUseCase {
  export type Input = {
    account: {
      email: string;
      password: string;
    };
    profile: {
      name: string;
      birthDate: Date;
      gender: Profile.Gender;
      height: number;
      weight: number;
      activityLevel: Profile.ActivityLevel;
      goal: Profile.Goal;
      targetWeight?: number;
    };
    timezoneOffsetMinutes?: number;
  };

  export type Output = {
    accessToken: string;
    refreshToken: string;
  };
}
