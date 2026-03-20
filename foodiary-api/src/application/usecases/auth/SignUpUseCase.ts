import { Account } from "@application/entities/Account";
import { EmailAlreadyInUse } from "@application/errors/application/EmailAlreadyInUse";
import { AccountRepository } from "@infra/database/dynamo/repositories/AccountRepository";
import { AuthGateway } from "@infra/gateways/AuthGateway";
import { Injectable } from "@kernel/decorators/Injectable";

@Injectable()
export class SignUpUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly accountRepository: AccountRepository,
  ) {}

  async execute({
    email,
    password,
  }: SignUpUseCase.Input): Promise<SignUpUseCase.Output> {
    const emailAlreadyExists = await this.accountRepository.findByEmail(email);

    if (emailAlreadyExists) {
      throw new EmailAlreadyInUse();
    }

    const account = new Account({ email });

    const { externalId } = await this.authGateway.signUp({
      email,
      password,
      internalId: account.id,
    });

    account.externalId = externalId;

    await this.accountRepository.create(account);

    let accessToken: string;
    let refreshToken: string;

    try {
      const signInResult = await this.authGateway.signIn({
        email,
        password,
      });
      accessToken = signInResult.accessToken;
      refreshToken = signInResult.refreshToken;
    } catch (error) {
      if ((error as { name?: string }).name !== "UserNotConfirmedException") {
        throw error;
      }

      await this.authGateway.confirmUser(email);

      const signInResult = await this.authGateway.signIn({
        email,
        password,
      });
      accessToken = signInResult.accessToken;
      refreshToken = signInResult.refreshToken;
    }

    return {
      accessToken,
      refreshToken,
    };
  }
}

export namespace SignUpUseCase {
  export type Input = {
    email: string;
    password: string;
  };

  export type Output = {
    accessToken: string;
    refreshToken: string;
  };
}
