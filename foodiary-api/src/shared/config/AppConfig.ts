import { Injectable } from "@kernel/decorators/Injectable";
import { env } from "./env";

@Injectable()
export class AppConfig {
  public readonly auth: AppConfig.Auth;

  constructor() {
    this.auth = {
      cognito: {
        client: {
          id: env.COGNITO_CLIENT_ID,
          secret: env.COGNITO_CLIENT_SECRET,
        },
      },
    };
  }
}

export namespace AppConfig {
  export type Auth = {
    cognito: {
      client: {
        id: string;
        secret: string;
      };
    };
  };
}
