import { Controller } from '@application/contracts/Controller';
import { GetWeeklySummaryQuery } from '@application/query/GetWeeklySummaryQuery';
import { Injectable } from '@kernel/decorators/Injectable';
import { getWeeklySummarySchema } from './schemas/getWeeklySummarySchema';

@Injectable([GetWeeklySummaryQuery])
export class GetWeeklySummaryController extends Controller<'private', GetWeeklySummaryQuery.Output> {
  constructor(private readonly query: GetWeeklySummaryQuery) {
    super();
  }

  protected override async handle({ accountId, queryParams }: Controller.Request<'private'>): Promise<Controller.Response<GetWeeklySummaryQuery.Output>> {
    const { startDate, timezoneOffsetMinutes } = getWeeklySummarySchema.parse(queryParams);
    const body = await this.query.execute({ accountId, startDate, timezoneOffsetMinutes });
    return { statusCode: 200, body };
  }
}
