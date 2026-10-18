import { Account } from '@application/entities/Account';
import { Goal } from '@application/entities/Goal';
import { Profile } from '@application/entities/Profile';
import { EmailAlreadyInUse } from '@application/errors/application/EmailAlreadyInUse';
import { BadRequest } from '@application/errors/http/BadRequest';
import { GoalCalculator } from '@application/services/GoalCalculator';
import { isValidBirthDate } from '@application/shared/birthDateSchema';
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
    profile: profileInfo,
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
    const profile = new Profile({
      ...profileInfo,
      name: profileInfo.name.trim(),
      accountId: account.id,
    });

    const {
      calories,
      carbohydrates,
      fats,
      proteins,
    } = GoalCalculator.calculate(profile);

    const goal = new Goal({
      accountId: account.id,
      calories,
      carbohydrates,
      fats,
      proteins,
    });

    const passwordHash = await hashPassword(password);

    await this.signUpUow.run({
      account,
      goal,
      profile,
      passwordHash,
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
    };
  };

  export type Output = {
    accessToken: string;
    refreshToken: string;
  };
}
