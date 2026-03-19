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

    const { externalId } = await this.authGateway.signUp({ email, password });

    const account = new Account({ email, externalId });
    await this.accountRepository.create(account);

    const { accessToken, refreshToken } = await this.authGateway.signIn({
      email,
      password,
    });

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
