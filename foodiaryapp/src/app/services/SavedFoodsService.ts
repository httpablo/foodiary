import { SavedFood } from '@app/types/SavedFood';
import { Service } from './Service';

export class SavedFoodsService extends Service {
  static async list(): Promise<SavedFood[]> {
    const { data } = await this.client.get<{ foods: SavedFood[] }>('/saved-foods');
    return data.foods;
  }

  static async save(food: Omit<SavedFood, 'id'>): Promise<void> {
    await this.client.put('/saved-foods', food);
  }

  static async delete(id: string): Promise<void> {
    await this.client.delete(`/saved-foods/${id}`);
  }
}
