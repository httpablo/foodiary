import { AuthStackNavigationProps } from '@app/navigation/AuthStack';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { OnboardingContext } from '.';
import { onboardingNavigation } from '../OnboardingStack';
import { OnboardingSchema } from '../schema';
import { getActiveSteps } from '../steps';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { goBack } = useNavigation<AuthStackNavigationProps>();
  const { control, getValues } = useFormContext<OnboardingSchema>();
  const goal = useWatch({ control, name: 'goal' });
  const totalSteps = getActiveSteps(goal).length;

  const nextStep = useCallback(() => {
    const nextStepIndex = currentStepIndex + 1;
    const nextStep = getActiveSteps(getValues('goal'))[nextStepIndex];

    if (!nextStep) {
      return;
    }

    onboardingNavigation.navigate(nextStep);
    setCurrentStepIndex(nextStepIndex);
  }, [currentStepIndex, getValues]);

  const previousStep = useCallback(() => {
    const previousStepIndex = currentStepIndex - 1;

    if (!onboardingNavigation.canGoBack()) {
      goBack();
      return;
    }

    onboardingNavigation.goBack();
    setCurrentStepIndex(previousStepIndex);
  }, [currentStepIndex, goBack]);

  return (
    <OnboardingContext.Provider
      value={{
        currentStepIndex,
        totalSteps,
        nextStep,
        previousStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
