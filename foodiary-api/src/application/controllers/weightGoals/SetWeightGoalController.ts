import { Controller } from '@application/contracts/Controller';
import { GetWeightGoalUseCase } from '@application/usecases/weightGoals/GetWeightGoalUseCase';
import { SetWeightGoalUseCase } from '@application/usecases/weightGoals/SetWeightGoalUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { SetWeightGoalBody, setWeightGoalSchema } from './schemas/weightGoalSchema';

@Injectable([SetWeightGoalUseCase])
@Schema(setWeightGoalSchema)
export class SetWeightGoalController extends Controller<'private', GetWeightGoalUseCase.Output> {
  constructor(private readonly setWeightGoalUseCase: SetWeightGoalUseCase) {
    super();
  }

  protected override async handle({
    accountId,
    body,
  }: Controller.Request<'private', SetWeightGoalBody>): Promise<Controller.Response<GetWeightGoalUseCase.Output>> {
    const result = await this.setWeightGoalUseCase.execute({
      accountId,
      targetWeight: body.targetWeight,
      paceKgPerWeek: body.paceKgPerWeek,
      applyToDailyGoals: body.applyToDailyGoals,
      timezoneOffsetMinutes: body.timezoneOffsetMinutes,
    });

    return { statusCode: 200, body: result };
  }
}
