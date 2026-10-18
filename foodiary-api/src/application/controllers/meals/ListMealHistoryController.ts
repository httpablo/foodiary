import { Controller } from '@application/contracts/Controller';
import { ListMealHistoryQuery } from '@application/query/ListMealHistoryQuery';
import { Injectable } from '@kernel/decorators/Injectable';
import { listMealHistorySchema } from './schemas/listMealHistorySchema';

type HistoryResponse = Awaited<ReturnType<ListMealHistoryQuery['execute']>>;

@Injectable([ListMealHistoryQuery])
export class ListMealHistoryController extends Controller<'private', HistoryResponse> {
  constructor(private readonly history: ListMealHistoryQuery) { super(); }

  protected override async handle({ accountId, queryParams }: Controller.Request<'private'>) {
    const params = listMealHistorySchema.parse(queryParams);
    return { statusCode: 200, body: await this.history.execute({ accountId, ...params }) };
  }
}
