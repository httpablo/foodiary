import { Controller } from '@application/contracts/Controller';
import { SaveFoodUseCase } from '@application/usecases/savedFoods/SaveFoodUseCase';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { SaveFoodBody, saveFoodSchema } from './schemas/saveFoodSchema';

@Injectable([SaveFoodUseCase])
@Schema(saveFoodSchema)
export class SaveFoodController extends Controller<'private', { id: string }> {
  constructor(private readonly saveFoodUseCase: SaveFoodUseCase) {
    super();
  }

  protected override async handle({ accountId, body }: Controller.Request<'private', SaveFoodBody>) {
    return { statusCode: 200, body: await this.saveFoodUseCase.execute({ accountId, food: body }) };
  }
}
