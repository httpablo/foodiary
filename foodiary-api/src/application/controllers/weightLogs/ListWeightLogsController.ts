import { Controller } from '@application/contracts/Controller';
import { GetWeightLogsUseCase } from '@application/usecases/weightLogs/GetWeightLogsUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { listWeightLogsQuerySchema } from './schemas/logWeightSchema';

@Injectable([GetWeightLogsUseCase])
export class ListWeightLogsController extends Controller<'private', GetWeightLogsUseCase.Output> {
  constructor(private readonly getWeightLogsUseCase: GetWeightLogsUseCase) {
    super();
  }

  protected override async handle({
    accountId,
    queryParams,
  }: Controller.Request<'private'>): Promise<Controller.Response<GetWeightLogsUseCase.Output>> {
    const { limit } = listWeightLogsQuerySchema.parse(queryParams);
    const body = await this.getWeightLogsUseCase.execute({ accountId, limit });
    return { statusCode: 200, body };
  }
}
