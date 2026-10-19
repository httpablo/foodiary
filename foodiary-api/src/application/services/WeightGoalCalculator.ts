import { WeightGoal } from '@application/entities/WeightGoal';
import { BadRequest } from '@application/errors/http/BadRequest';
import { addDays, diffInDays } from '@application/shared/localDate';

export class WeightGoalCalculator {
  static minTargetWeight = 30;

  static maxTargetWeight = 700;

  static minDifferenceKg = 0.5;

  private static minHealthyBmi = 18.5;

  private static maxHealthyBmi = 24.9;

  private static windowInDays = 28;

  private static toleranceInDays = 7;

  private static paceStepKg = 0.05;

  private static basePaces: Record<WeightGoal.Direction, Record<WeightGoal.PaceKey, number>> = {
    [WeightGoal.Direction.LOSE]: {
      [WeightGoal.PaceKey.RELAXED]: 0.25,
      [WeightGoal.PaceKey.RECOMMENDED]: 0.5,
      [WeightGoal.PaceKey.AGGRESSIVE]: 0.75,
    },
    [WeightGoal.Direction.GAIN]: {
      [WeightGoal.PaceKey.RELAXED]: 0.1,
      [WeightGoal.PaceKey.RECOMMENDED]: 0.25,
      [WeightGoal.PaceKey.AGGRESSIVE]: 0.4,
    },
  };

  private static maxPaceRatios: Record<WeightGoal.Direction, number> = {
    [WeightGoal.Direction.LOSE]: 0.01,
    [WeightGoal.Direction.GAIN]: 0.005,
  };

  static direction(currentWeight: number, targetWeight: number): WeightGoal.Direction {
    return targetWeight < currentWeight ? WeightGoal.Direction.LOSE : WeightGoal.Direction.GAIN;
  }

  static bmi(weight: number, heightCm: number): number {
    const heightInMeters = heightCm / 100;
    return weight / (heightInMeters * heightInMeters);
  }

  static healthyRange(heightCm: number): WeightGoalCalculator.HealthyRange {
    const heightInMeters = heightCm / 100;
    const squared = heightInMeters * heightInMeters;

    return {
      min: this.round(this.minHealthyBmi * squared, 1),
      max: this.round(this.maxHealthyBmi * squared, 1),
    };
  }

  static isAboveHealthyRange(targetWeight: number, heightCm: number): boolean {
    return this.bmi(targetWeight, heightCm) > this.maxHealthyBmi;
  }

  static assertValidTarget({ currentWeight, targetWeight, heightCm }: WeightGoalCalculator.TargetInput): void {
    if (
      !Number.isFinite(targetWeight)
      || targetWeight < this.minTargetWeight
      || targetWeight > this.maxTargetWeight
    ) {
      throw new BadRequest('Target weight must be between 30 and 700 kg.');
    }

    if (Math.abs(targetWeight - currentWeight) < this.minDifferenceKg) {
      throw new BadRequest('Target weight must differ from current weight by at least 0.5 kg.');
    }

    if (this.bmi(targetWeight, heightCm) < this.minHealthyBmi) {
      throw new BadRequest('Target weight is below the healthy range for your height.');
    }
  }

  static maxPace(direction: WeightGoal.Direction, currentWeight: number): number {
    return currentWeight * this.maxPaceRatios[direction];
  }

  static assertValidPace(direction: WeightGoal.Direction, currentWeight: number, paceKgPerWeek: number): void {
    const max = this.maxPace(direction, currentWeight);

    if (!Number.isFinite(paceKgPerWeek) || paceKgPerWeek <= 0 || paceKgPerWeek > max + 1e-9) {
      throw new BadRequest(`Pace must be greater than 0 and at most ${this.round(max, 2)} kg per week.`);
    }
  }

  static paceOptions(
    direction: WeightGoal.Direction,
    currentWeight: number,
  ): WeightGoalCalculator.PaceOption[] {
    const max = this.maxPace(direction, currentWeight);
    const maxStep = Math.max(Math.floor(max / this.paceStepKg + 1e-9), 1);

    return [
      WeightGoal.PaceKey.RELAXED,
      WeightGoal.PaceKey.RECOMMENDED,
      WeightGoal.PaceKey.AGGRESSIVE,
    ].map((key) => {
      const steps = Math.min(Math.round(this.basePaces[direction][key] / this.paceStepKg), maxStep);
      return { key, paceKgPerWeek: this.round(steps * this.paceStepKg, 2) };
    });
  }

  static weeksToReach(distanceKg: number, paceKgPerWeek: number): number {
    return Math.max(Math.ceil(distanceKg / paceKgPerWeek - 1e-9), 1);
  }

  static trendWeight(logs: WeightGoalCalculator.Log[]): number | null {
    if (logs.length === 0) {
      return null;
    }

    const latestDate = logs.reduce((latest, log) => (log.date > latest ? log.date : latest), logs[0].date);
    const recent = logs.filter(log => log.date > addDays(latestDate, -7) && log.date <= latestDate);
    const sum = recent.reduce((total, log) => total + log.weight, 0);

    return this.round(sum / recent.length, 2);
  }

  static view(
    goal: WeightGoal,
    currentWeight: number,
    logs: WeightGoalCalculator.Log[],
    today: string,
  ): WeightGoalCalculator.WeightGoalView {
    return {
      id: goal.id,
      status: goal.status === WeightGoal.Status.ACHIEVED ? 'ACHIEVED' : 'ACTIVE',
      direction: goal.direction,
      startWeight: goal.startWeight,
      targetWeight: goal.targetWeight,
      startDate: goal.startDate,
      paceKgPerWeek: goal.paceKgPerWeek,
      achievedAt: goal.achievedAt ? goal.achievedAt.toISOString() : null,
      progress: this.progress(goal, currentWeight, logs, today),
    };
  }

  static progress(
    goal: WeightGoal,
    currentWeight: number,
    logs: WeightGoalCalculator.Log[],
    today: string,
  ): WeightGoalCalculator.Progress {
    const losing = goal.direction === WeightGoal.Direction.LOSE;
    const total = Math.abs(goal.targetWeight - goal.startWeight);
    const changed = losing ? goal.startWeight - currentWeight : currentWeight - goal.startWeight;
    const remaining = Math.max(0, losing ? currentWeight - goal.targetWeight : goal.targetWeight - currentWeight);
    const percent = total > 0 ? Math.min(Math.max((changed / total) * 100, 0), 100) : 0;
    const plannedDate = addDays(
      goal.startDate,
      this.weeksToReach(total, goal.paceKgPerWeek) * 7,
    );

    // Only logs since the goal started count, so a fresh goal never inherits an old trend.
    const projection = this.project(logs.filter(log => log.date >= goal.startDate), losing, remaining, today);
    let trackStatus: WeightGoalCalculator.TrackStatus = projection.trackStatus;

    if (projection.projectedDate) {
      const delta = diffInDays(plannedDate, projection.projectedDate);
      trackStatus = delta <= -this.toleranceInDays
        ? 'AHEAD'
        : delta > this.toleranceInDays ? 'BEHIND' : 'ON_TRACK';
    }

    return {
      totalKg: this.round(total, 2),
      changedKg: this.round(changed, 2),
      remainingKg: this.round(remaining, 2),
      percent: this.round(percent, 1),
      plannedDate,
      projectedDate: projection.projectedDate,
      weeklyRateKg: projection.weeklyRateKg,
      trackStatus,
    };
  }

  // Least-squares line over the logs of the last 28 days.
  private static project(
    logs: WeightGoalCalculator.Log[],
    losing: boolean,
    remainingKg: number,
    today: string,
  ): WeightGoalCalculator.Projection {
    const windowStart = addDays(today, -this.windowInDays);
    const windowLogs = logs
      .filter(log => log.date >= windowStart && log.date <= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    const notEnoughData: WeightGoalCalculator.Projection = {
      projectedDate: null,
      weeklyRateKg: null,
      trackStatus: 'NOT_ENOUGH_DATA',
    };

    if (windowLogs.length < 2) {
      return notEnoughData;
    }

    const firstDate = windowLogs[0].date;

    if (diffInDays(firstDate, windowLogs[windowLogs.length - 1].date) < 7) {
      return notEnoughData;
    }

    const points = windowLogs.map(log => ({ x: diffInDays(firstDate, log.date), y: log.weight }));
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const variance = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    const covariance = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
    const slopePerDay = covariance / variance;
    const towardPerDay = losing ? -slopePerDay : slopePerDay;
    const weeklyRateKg = this.round(towardPerDay * 7, 2);

    if (remainingKg <= 0) {
      return { projectedDate: today, weeklyRateKg, trackStatus: 'ON_TRACK' };
    }

    if (weeklyRateKg <= 0) {
      return { projectedDate: null, weeklyRateKg, trackStatus: 'OFF_TRACK' };
    }

    return {
      projectedDate: addDays(today, Math.ceil(remainingKg / towardPerDay)),
      weeklyRateKg,
      trackStatus: 'ON_TRACK',
    };
  }

  private static round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}

export namespace WeightGoalCalculator {
  export type HealthyRange = { min: number; max: number };

  export type TargetInput = {
    currentWeight: number;
    targetWeight: number;
    heightCm: number;
  };

  export type PaceOption = {
    key: WeightGoal.PaceKey;
    paceKgPerWeek: number;
  };

  export type Log = { date: string; weight: number };

  export type TrackStatus = 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'OFF_TRACK' | 'NOT_ENOUGH_DATA';

  export type Projection = {
    projectedDate: string | null;
    weeklyRateKg: number | null;
    trackStatus: TrackStatus;
  };

  export type Progress = {
    totalKg: number;
    changedKg: number;
    remainingKg: number;
    percent: number;
    plannedDate: string;
    projectedDate: string | null;
    weeklyRateKg: number | null;
    trackStatus: TrackStatus;
  };

  export type WeightGoalView = {
    id: string;
    status: 'ACTIVE' | 'ACHIEVED';
    direction: WeightGoal.Direction;
    startWeight: number;
    targetWeight: number;
    startDate: string;
    paceKgPerWeek: number;
    achievedAt: string | null;
    progress: Progress;
  };
}
