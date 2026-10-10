import { LocalAuthGateway } from '@infra/auth/LocalAuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([LocalAuthGateway])
export class SignInUseCase {
  constructor(
    private readonly authGateway: LocalAuthGateway,
  ) {}

  async execute({
    email,
    password,
  }: SignInUseCase.Input): Promise<SignInUseCase.Output> {
    return this.authGateway.signIn({ email, password });
  }
}

export namespace SignInUseCase {
  export type Input = {
    email: string;
    password: string;
  };

  export type Output = {
    accessToken: string;
    refreshToken: string;
  };
}
