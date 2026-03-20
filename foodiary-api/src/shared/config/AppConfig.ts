import { Injectable } from "@kernel/decorators/Injectable";
import { env } from "./env";

@Injectable()
export class AppConfig {
  public readonly auth: AppConfig.Auth;

  readonly db: AppConfig.Database;

  constructor() {
    this.auth = {
      cognito: {
        userPoolId: env.COGNITO_USER_POOL_ID,
        client: {
          id: env.COGNITO_CLIENT_ID,
          secret: env.COGNITO_CLIENT_SECRET,
        },
      },
    };

    this.db = {
      dynamodb: {
        mainTable: env.MAIN_TABLE_NAME,
      },
    };
  }
}

export namespace AppConfig {
  export type Auth = {
    cognito: {
      userPoolId: string;
      client: {
        id: string;
        secret: string;
      };
    };
  };

  export type Database = {
    dynamodb: {
      mainTable: string;
    };
  };
}
