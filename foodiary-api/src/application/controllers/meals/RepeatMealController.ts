import { Controller } from '@application/contracts/Controller';
import { RepeatMealUseCase } from '@application/usecases/meals/RepeatMealUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { updateMealSchema, UpdateMealBody } from './schemas/updateMealSchema';

@Injectable([RepeatMealUseCase])
@Schema(updateMealSchema)
export class RepeatMealController extends Controller<'private', RepeatMealController.Response> {
  constructor(private readonly repeatMealUseCase: RepeatMealUseCase) {
    super();
  }

  protected override async handle({ accountId, params, body }: Controller.Request<'private', UpdateMealBody, { mealId: string }>): Promise<Controller.Response<RepeatMealController.Response>> {
    const result = await this.repeatMealUseCase.execute({
      accountId,
      sourceMealId: params.mealId,
      ...body,
    });
    return { statusCode: 201, body: result };
  }
}

export namespace RepeatMealController {
  export type Response = { mealId: string };
}
