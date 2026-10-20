import { Controller } from '@application/contracts/Controller';
import { GetAchievementsUseCase } from '@application/usecases/achievements/GetAchievementsUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { getAchievementsSchema } from './schemas/achievementsSchema';

@Injectable([GetAchievementsUseCase])
export class GetAchievementsController extends Controller<'private', GetAchievementsUseCase.Output> {
  constructor(private readonly getAchievementsUseCase: GetAchievementsUseCase) {
    super();
  }

  protected override async handle({ accountId, queryParams }: Controller.Request<'private'>): Promise<Controller.Response<GetAchievementsUseCase.Output>> {
    const { timezoneOffsetMinutes } = getAchievementsSchema.parse(queryParams);
    const body = await this.getAchievementsUseCase.execute({ accountId, timezoneOffsetMinutes });
    return { statusCode: 200, body };
  }
}
