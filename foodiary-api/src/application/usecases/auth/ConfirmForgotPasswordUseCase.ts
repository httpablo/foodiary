import { LocalAuthGateway } from '@infra/auth/LocalAuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([LocalAuthGateway])
export class ConfirmForgotPasswordUseCase {
  constructor(
    private readonly authGateway: LocalAuthGateway,
  ) {}

  async execute({
    email,
    confirmationCode,
    password,
  }: ConfirmForgotPasswordUseCase.Input): Promise<ConfirmForgotPasswordUseCase.Output> {
    await this.authGateway.confirmForgotPassword({
      email,
      confirmationCode,
      password,
    });
  }
}

export namespace ConfirmForgotPasswordUseCase {
  export type Input = {
    email: string;
    confirmationCode: string;
    password: string;
  };

  export type Output = void;
}
