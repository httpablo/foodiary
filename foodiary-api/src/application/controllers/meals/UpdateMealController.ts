import { Controller } from '@application/contracts/Controller';
import { UpdateMealUseCase } from '@application/usecases/meals/UpdateMealUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { updateMealSchema, UpdateMealBody } from './schemas/updateMealSchema';

@Injectable([UpdateMealUseCase])
@Schema(updateMealSchema)
export class UpdateMealController extends Controller<'private'> {
  constructor(private readonly updateMealUseCase: UpdateMealUseCase) {
    super();
  }

  protected override async handle({ accountId, params, body }: Controller.Request<'private', UpdateMealBody, { mealId: string }>): Promise<Controller.Response> {
    await this.updateMealUseCase.execute({ accountId, mealId: params.mealId, ...body });
    return { statusCode: 204 };
  }
}
