import { Controller } from '@application/contracts/Controller';
import { RecalculateGoalsUseCase } from '@application/usecases/weightGoals/RecalculateGoalsUseCase';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([RecalculateGoalsUseCase])
export class RecalculateGoalsController extends Controller<'private', RecalculateGoalsUseCase.Output> {
  constructor(private readonly recalculateGoalsUseCase: RecalculateGoalsUseCase) {
    super();
  }

  protected override async handle({
    accountId,
  }: Controller.Request<'private'>): Promise<Controller.Response<RecalculateGoalsUseCase.Output>> {
    const body = await this.recalculateGoalsUseCase.execute({ accountId });
    return { statusCode: 200, body };
  }
}
