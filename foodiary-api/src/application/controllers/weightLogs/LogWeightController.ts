import { Controller } from '@application/contracts/Controller';
import { LogWeightUseCase } from '@application/usecases/weightLogs/LogWeightUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { LogWeightBody, logWeightSchema } from './schemas/logWeightSchema';

@Injectable([LogWeightUseCase])
@Schema(logWeightSchema)
export class LogWeightController extends Controller<'private', LogWeightUseCase.Output> {
  constructor(private readonly logWeightUseCase: LogWeightUseCase) {
    super();
  }

  protected override async handle({
    accountId,
    body,
  }: Controller.Request<'private', LogWeightBody>): Promise<Controller.Response<LogWeightUseCase.Output>> {
    const result = await this.logWeightUseCase.execute({
      accountId,
      weight: body.weight,
      date: body.date,
      timezoneOffsetMinutes: body.timezoneOffsetMinutes,
      applySuggestedGoal: body.applySuggestedGoal,
    });

    return { statusCode: 200, body: result };
  }
}
