import { Controller } from '@application/contracts/Controller';
import { EndWeightGoalUseCase } from '@application/usecases/weightGoals/EndWeightGoalUseCase';
import { GetWeightGoalUseCase } from '@application/usecases/weightGoals/GetWeightGoalUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { weightGoalQuerySchema } from './schemas/weightGoalSchema';

@Injectable([EndWeightGoalUseCase])
export class EndWeightGoalController extends Controller<'private', GetWeightGoalUseCase.Output> {
  constructor(private readonly endWeightGoalUseCase: EndWeightGoalUseCase) {
    super();
  }

  protected override async handle({
    accountId,
    queryParams,
  }: Controller.Request<'private'>): Promise<Controller.Response<GetWeightGoalUseCase.Output>> {
    const { timezoneOffsetMinutes } = weightGoalQuerySchema.parse(queryParams);
    const body = await this.endWeightGoalUseCase.execute({ accountId, timezoneOffsetMinutes });
    return { statusCode: 200, body };
  }
}
