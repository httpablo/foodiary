import { Account } from "@application/entities/Account";

export class AccountItem {
  private readonly type = "account";
  private readonly keys: AccountItem.Keys;

  constructor(private readonly attrs: AccountItem.Atributes) {
    this.keys = {
      PK: AccountItem.getPK(attrs.id),
      SK: AccountItem.getSK(attrs.id),
      GSI1PK: AccountItem.getGSI1PK(attrs.email),
      GSI1SK: AccountItem.getGSI1SK(attrs.email),
    };
  }

  toItem(): AccountItem.ItemType {
    return {
      ...this.keys,
      ...this.attrs,
      type: this.type,
    };
  }

  static fromEntity(account: Account) {
    return new AccountItem({
      ...account,
      createdAt: account.createdAt.toISOString(),
    });
  }

  static getPK(accountId: string): AccountItem.Keys["PK"] {
    return `ACCOUNT#${accountId}`;
  }

  static getSK(accountId: string): AccountItem.Keys["SK"] {
    return `ACCOUNT#${accountId}`;
  }

  static getGSI1PK(email: string): AccountItem.Keys["GSI1PK"] {
    return `ACCOUNT#${email}`;
  }

  static getGSI1SK(email: string): AccountItem.Keys["GSI1SK"] {
    return `ACCOUNT#${email}`;
  }
}

export namespace AccountItem {
  export type Keys = {
    PK: `ACCOUNT#${string}`;
    SK: `ACCOUNT#${string}`;
    GSI1PK: `ACCOUNT#${string}`;
    GSI1SK: `ACCOUNT#${string}`;
  };

  export type Atributes = {
    id: string;
    email: string;
    externalId: string;
    createdAt: string;
  };

  export type ItemType = Keys &
    Atributes & {
      type: "account";
    };
}
