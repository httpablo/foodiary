import { Account } from "@application/entities/Account";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoClient } from "@infra/clients/dynamoClient";
import { Injectable } from "@kernel/decorators/Injectable";
import { AppConfig } from "@shared/config/AppConfig";

@Injectable()
export class AccountRepository {
  constructor(private readonly config: AppConfig) {}

  async create(account: Account): Promise<void> {
    const command = new PutCommand({
      TableName: this.config.db.dynamodb.mainTable,
      Item: {
        type: "account",
        id: account.id,
        email: account.email,
        externalId: account.externalId,
        PK: `ACCOUNT#${account.id}`,
      },
    });
    await dynamoClient.send(command);
  }
}
