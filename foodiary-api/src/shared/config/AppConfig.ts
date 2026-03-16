import { Injectable } from "@kernel/decorators/Injectable";
import { env } from "./env";

@Injectable()
export class AppConfig {
  public readonly auth: AppConfig.Auth;

  constructor() {
    this.auth = {
      cognito: {
        clientId: env.COGNITO_CLIENT_ID,
      },
    };
  }
}

export namespace AppConfig {
  export type Auth = {
    cognito: {
      clientId: string;
    };
  };
}
