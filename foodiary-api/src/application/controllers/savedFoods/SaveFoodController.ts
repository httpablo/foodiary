import { mealFoodSchema } from '@application/controllers/meals/schemas/updateMealSchema';
import { Controller } from '@application/contracts/Controller';
import { SavedFoodRepository } from '@infra/database/postgres/repositories/SavedFoodRepository';
import { Injectable } from '@kernel/decorators/Injectable';
import { Schema } from '@kernel/decorators/Schema';
import { z } from 'zod';

@Injectable([SavedFoodRepository])
@Schema(mealFoodSchema)
export class SaveFoodController extends Controller<'private', { id: string }> {
  constructor(private readonly repository: SavedFoodRepository) {
    super();
  }

  protected override async handle({ accountId, body }: Controller.Request<'private', z.infer<typeof mealFoodSchema>>) {
    return { statusCode: 200, body: { id: await this.repository.save(accountId, body) } };
  }
}
