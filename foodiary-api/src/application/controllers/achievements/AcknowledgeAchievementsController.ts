import { Controller } from '@application/contracts/Controller';
import { AcknowledgeAchievementsUseCase } from '@application/usecases/achievements/AcknowledgeAchievementsUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { AcknowledgeAchievementsBody, acknowledgeAchievementsSchema } from './schemas/achievementsSchema';

@Injectable([AcknowledgeAchievementsUseCase])
@Schema(acknowledgeAchievementsSchema)
export class AcknowledgeAchievementsController extends Controller<'private', null> {
  constructor(private readonly acknowledgeAchievementsUseCase: AcknowledgeAchievementsUseCase) {
    super();
  }

  protected override async handle({
    accountId,
    body,
  }: Controller.Request<'private', AcknowledgeAchievementsBody>): Promise<Controller.Response<null>> {
    await this.acknowledgeAchievementsUseCase.execute({ accountId, codes: body.codes });
    return { statusCode: 204 };
  }
}
