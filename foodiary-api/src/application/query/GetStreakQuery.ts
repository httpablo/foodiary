import { StreakCalculator } from '@application/services/StreakCalculator';
import { localDateFromOffset } from '@application/shared/localDate';
import { MealRepository } from '@infra/database/postgres/repositories/MealRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([MealRepository])
export class GetStreakQuery {
  constructor(private readonly mealRepository: MealRepository) {}

  async execute({ accountId, timezoneOffsetMinutes }: GetStreakQuery.Input): Promise<GetStreakQuery.Output> {
    const days = await this.mealRepository.listLoggedDays(accountId, timezoneOffsetMinutes);
    return StreakCalculator.calculate(days, localDateFromOffset(timezoneOffsetMinutes));
  }
}

export namespace GetStreakQuery {
  export type Input = {
    accountId: string;
    timezoneOffsetMinutes: number;
  };

  export type Output = StreakCalculator.Result;
}
