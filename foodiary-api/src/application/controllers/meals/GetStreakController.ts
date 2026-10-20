import { Controller } from '@application/contracts/Controller';
import { GetStreakQuery } from '@application/query/GetStreakQuery';
import { Injectable } from '@kernel/decorators/Injectable';
import { getStreakSchema } from './schemas/getStreakSchema';

@Injectable([GetStreakQuery])
export class GetStreakController extends Controller<'private', GetStreakQuery.Output> {
  constructor(private readonly query: GetStreakQuery) {
    super();
  }

  protected override async handle({ accountId, queryParams }: Controller.Request<'private'>): Promise<Controller.Response<GetStreakQuery.Output>> {
    const { timezoneOffsetMinutes } = getStreakSchema.parse(queryParams);
    const body = await this.query.execute({ accountId, timezoneOffsetMinutes });
    return { statusCode: 200, body };
  }
}
