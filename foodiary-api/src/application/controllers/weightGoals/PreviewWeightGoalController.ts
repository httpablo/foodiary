import { Controller } from '@application/contracts/Controller';
import { PreviewWeightGoalUseCase } from '@application/usecases/weightGoals/PreviewWeightGoalUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { previewWeightGoalQuerySchema } from './schemas/weightGoalSchema';

@Injectable([PreviewWeightGoalUseCase])
export class PreviewWeightGoalController extends Controller<'private', PreviewWeightGoalUseCase.Output> {
  constructor(private readonly previewWeightGoalUseCase: PreviewWeightGoalUseCase) {
    super();
  }

  protected override async handle({
    accountId,
    queryParams,
  }: Controller.Request<'private'>): Promise<Controller.Response<PreviewWeightGoalUseCase.Output>> {
    const { targetWeight, timezoneOffsetMinutes } = previewWeightGoalQuerySchema.parse(queryParams);
    const body = await this.previewWeightGoalUseCase.execute({ accountId, targetWeight, timezoneOffsetMinutes });
    return { statusCode: 200, body };
  }
}
