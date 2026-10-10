import { LocalAuthGateway } from '@infra/auth/LocalAuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([LocalAuthGateway])
export class ForgotPasswordUseCase {
  constructor(
    private readonly authGateway: LocalAuthGateway,
  ) {}

  async execute({
    email,
  }: ForgotPasswordUseCase.Input): Promise<ForgotPasswordUseCase.Output> {
    await this.authGateway.forgotPassword({ email });
  }
}

export namespace ForgotPasswordUseCase {
  export type Input = {
    email: string;
  };

  export type Output = void;
}
