import { Goal } from '@app/types/Goal';
import { OnboardingStackParamList } from './OnboardingStack';

export const orderedSteps: (keyof OnboardingStackParamList)[] = [
  'Goal',
  'Gender',
  'BirthDate',
  'Height',
  'Weight',
  'TargetWeight',
  'ActivityLevel',
  'CreateAccount',
];

// Quem quer manter o peso não tem peso-alvo, então a etapa é ignorada.
export function getActiveSteps(goal?: Goal) {
  return orderedSteps.filter(step => step !== 'TargetWeight' || (goal !== undefined && goal !== Goal.MAINTAIN));
}
