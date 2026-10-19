import KSUID from 'ksuid';

export class WeightGoal {
  readonly id: string;

  readonly accountId: string;

  readonly startWeight: number;

  readonly targetWeight: number;

  readonly startDate: string;

  readonly paceKgPerWeek: number;

  status: WeightGoal.Status;

  achievedAt: Date | null;

  acknowledgedAt: Date | null;

  readonly createdAt: Date;

  constructor(attr: WeightGoal.Attributes) {
    this.id = attr.id ?? KSUID.randomSync().string;
    this.accountId = attr.accountId;
    this.startWeight = attr.startWeight;
    this.targetWeight = attr.targetWeight;
    this.startDate = attr.startDate;
    this.paceKgPerWeek = attr.paceKgPerWeek;
    this.status = attr.status ?? WeightGoal.Status.ACTIVE;
    this.achievedAt = attr.achievedAt ?? null;
    this.acknowledgedAt = attr.acknowledgedAt ?? null;
    this.createdAt = attr.createdAt ?? new Date();
  }

  get direction(): WeightGoal.Direction {
    return this.targetWeight < this.startWeight
      ? WeightGoal.Direction.LOSE
      : WeightGoal.Direction.GAIN;
  }
}

export namespace WeightGoal {
  export type Attributes = {
    id?: string;
    accountId: string;
    startWeight: number;
    targetWeight: number;
    startDate: string;
    paceKgPerWeek: number;
    status?: WeightGoal.Status;
    achievedAt?: Date | null;
    acknowledgedAt?: Date | null;
    createdAt?: Date;
  };

  export enum Status {
    ACTIVE = 'ACTIVE',
    ACHIEVED = 'ACHIEVED',
    ABANDONED = 'ABANDONED'
  }

  export enum Direction {
    LOSE = 'LOSE',
    GAIN = 'GAIN'
  }

  export enum PaceKey {
    RELAXED = 'RELAXED',
    RECOMMENDED = 'RECOMMENDED',
    AGGRESSIVE = 'AGGRESSIVE'
  }
}
