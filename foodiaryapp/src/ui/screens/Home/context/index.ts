import { SimplifiedMeal } from '@app/types/Meal';
import { createContext } from 'react';

export interface IHomeContextValue {
  date: Date;
  meals: SimplifiedMeal[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  previousDay: () => void;
  nextDay: () => void;
}

export const HomeContext = createContext({} as IHomeContextValue);
