import { Food } from './Meal';

export type SavedFood = Pick<Food, 'name' | 'quantity' | 'proteins' | 'carbohydrates' | 'fats'> & {
  id: string;
};
