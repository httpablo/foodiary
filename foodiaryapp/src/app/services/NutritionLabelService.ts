import { Platform } from 'react-native';
import { Service } from './Service';

export type NutritionLabel = {
  name: string | null;
  quantity: string | null;
  basis: string | null;
  calories: number | null;
  proteins: number | null;
  carbohydrates: number | null;
  fats: number | null;
};

export class NutritionLabelService extends Service {
  static async scan(uri: string): Promise<NutritionLabel> {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      form.append('file', blob, 'nutrition-label.jpeg');
    } else {
      form.append('file', {
        uri,
        name: 'nutrition-label.jpeg',
        type: 'image/jpeg',
      } as any);
    }
    const { data } = await this.client.post<NutritionLabel>('/nutrition-label/scan', form, {
      headers: { 'Content-Type': false },
      timeout: 45000,
    });
    return data;
  }
}
