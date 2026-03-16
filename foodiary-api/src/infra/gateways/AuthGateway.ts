import { SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognitoClient } from "@infra/clients/cognitoClient";
import { AppConfig } from "@shared/config/AppConfig";

export class AuthGateway {
  constructor(private readonly appConfig: AppConfig) {}

  async signUp({
    email,
    password,
  }: AuthGateway.SignUpParams): Promise<AuthGateway.SignUpResult> {
    const command = new SignUpCommand({
      ClientId: "",
      Username: email,
      Password: password,
    });

    const { UserSub: externalId } = await cognitoClient.send(command);

    if (!externalId) {
      throw new Error(`Failed to sign up user: ${email}`);
    }

    return { externalId };
  }
}

export namespace AuthGateway {
  export type SignUpParams = {
    email: string;
    password: string;
  };

  export type SignUpResult = {
    externalId: string;
  };
}
