import { Controller } from '@application/contracts/Controller';
import { ResourceNotFound } from '@application/errors/application/ResourceNotFound';
import { SavedFoodRepository } from '@infra/database/postgres/repositories/SavedFoodRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([SavedFoodRepository])
export class DeleteSavedFoodController extends Controller<'private'> {
  constructor(private readonly repository: SavedFoodRepository) {
    super();
  }

  protected override async handle({ accountId, params }: Controller.Request<'private', Record<string, unknown>, { foodId: string }>) {
    if (!await this.repository.delete(accountId, params.foodId)) {
      throw new ResourceNotFound('Saved food not found.');
    }
    return { statusCode: 204 };
  }
}
