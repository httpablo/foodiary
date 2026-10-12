import { Controller } from '@application/contracts/Controller';
import { CreateManualMealUseCase } from '@application/usecases/meals/CreateManualMealUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { createManualMealSchema, CreateManualMealBody } from './schemas/createManualMealSchema';

@Injectable([CreateManualMealUseCase])
@Schema(createManualMealSchema)
export class CreateManualMealController extends Controller<'private', { mealId: string }> {
  constructor(private readonly createManualMealUseCase: CreateManualMealUseCase) {
    super();
  }

  protected override async handle({ accountId, body }: Controller.Request<'private', CreateManualMealBody>): Promise<Controller.Response<{ mealId: string }>> {
    const result = await this.createManualMealUseCase.execute({ accountId, ...body });
    return { statusCode: 201, body: result };
  }
}
