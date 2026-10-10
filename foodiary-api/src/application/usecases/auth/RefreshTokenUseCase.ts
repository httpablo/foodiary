import { LocalAuthGateway } from '@infra/auth/LocalAuthGateway';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([LocalAuthGateway])
export class RefreshTokenUseCase {
  constructor(
    private readonly authGateway: LocalAuthGateway,
  ) {}

  async execute({
    refreshToken,
  }: RefreshTokenUseCase.Input): Promise<RefreshTokenUseCase.Output> {
    const {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    } = await this.authGateway.refreshToken({ refreshToken });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}

export namespace RefreshTokenUseCase {
  export type Input = {
    refreshToken: string;
  };

  export type Output = {
    accessToken: string;
    refreshToken: string;
  };
}
