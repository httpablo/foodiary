import { Controller } from '@application/contracts/Controller';
import { SavedFood, SavedFoodRepository } from '@infra/database/postgres/repositories/SavedFoodRepository';
import { Injectable } from '@kernel/decorators/Injectable';

@Injectable([SavedFoodRepository])
export class ListSavedFoodsController extends Controller<'private', { foods: SavedFood[] }> {
  constructor(private readonly repository: SavedFoodRepository) {
    super();
  }

  protected override async handle({ accountId }: Controller.Request<'private'>) {
    return { statusCode: 200, body: { foods: await this.repository.list(accountId) } };
  }
}
