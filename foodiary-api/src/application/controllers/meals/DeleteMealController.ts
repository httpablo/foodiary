import { Controller } from '@application/contracts/Controller';
import { DeleteMealUseCase } from '@application/usecases/meals/DeleteMealUseCase';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([DeleteMealUseCase])
export class DeleteMealController extends Controller<'private'> {
  constructor(private readonly deleteMealUseCase: DeleteMealUseCase) {
    super();
  }

  protected override async handle({ accountId, params }: Controller.Request<'private', Record<string, unknown>, { mealId: string }>): Promise<Controller.Response> {
    await this.deleteMealUseCase.execute({ accountId, mealId: params.mealId });
    return { statusCode: 204 };
  }
}
