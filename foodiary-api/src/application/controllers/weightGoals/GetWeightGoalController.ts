import { Controller } from '@application/contracts/Controller';
import { GetWeightGoalUseCase } from '@application/usecases/weightGoals/GetWeightGoalUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { weightGoalQuerySchema } from './schemas/weightGoalSchema';

@Injectable([GetWeightGoalUseCase])
export class GetWeightGoalController extends Controller<'private', GetWeightGoalUseCase.Output> {
  constructor(private readonly getWeightGoalUseCase: GetWeightGoalUseCase) {
    super();
  }

  protected override async handle({
    accountId,
    queryParams,
  }: Controller.Request<'private'>): Promise<Controller.Response<GetWeightGoalUseCase.Output>> {
    const { timezoneOffsetMinutes } = weightGoalQuerySchema.parse(queryParams);
    const body = await this.getWeightGoalUseCase.execute({ accountId, timezoneOffsetMinutes });
    return { statusCode: 200, body };
  }
}
