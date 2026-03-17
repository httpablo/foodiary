import KSUID from "ksuid";

export class Account {
  readonly id: string;

  readonly email: string;

  externalId: string;

  constructor(attr: Account.Attributes) {
    this.id = KSUID.randomSync().string;
    this.email = attr.email;
    this.externalId = attr.externalId;
  }
}

export namespace Account {
  export type Attributes = {
    email: string;
    externalId: string;
  };
}
