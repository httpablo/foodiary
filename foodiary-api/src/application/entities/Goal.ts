export class Goal {
  readonly accountId: string;

  calories: number;

  proteins: number;

  carbohydrates: number;

  fats: number;

  source: Goal.Source;

  calculatedForWeight: number | null;

  readonly createdAt: Date;

  constructor(attr: Goal.Attributes) {
    this.accountId = attr.accountId;
    this.calories = attr.calories;
    this.proteins = attr.proteins;
    this.carbohydrates = attr.carbohydrates;
    this.fats = attr.fats;
    this.source = attr.source ?? Goal.Source.CALCULATED;
    this.calculatedForWeight = attr.calculatedForWeight ?? null;
    this.createdAt = attr.createdAt ?? new Date();
  }
}

export namespace Goal {
  export type Attributes = {
    accountId: string;
    calories: number;
    proteins: number;
    carbohydrates: number;
    fats: number;
    source?: Goal.Source;
    calculatedForWeight?: number | null;
    createdAt?: Date;
  };

  export enum Source {
    CALCULATED = 'CALCULATED',
    MANUAL = 'MANUAL'
  }
}
