import { ArrowRightIcon } from 'lucide-react-native';

import { Goal } from '@app/types/Goal';
import { Button } from '@ui/components/Button';
import { RadioGroup, RadioGroupIcon, RadioGroupItem, RadioGroupLabel } from '@ui/components/RadioGroup';
import { theme } from '@ui/styles/theme';
import { Controller, useFormContext } from 'react-hook-form';
import { Step, StepContent, StepFooter, StepHeader, StepSubtitle, StepTitle } from '../components/Step';
import { useOnboarding } from '../context/useOnboarding';
import { OnboardingSchema } from '../schema';

export function GoalStep() {
  const { nextStep } = useOnboarding();
  const form = useFormContext<OnboardingSchema>();

  async function handleNextStep() {
    const isValid = await form.trigger('goal');

    if (isValid) {
      nextStep();
    }
  }

  return (
    <Step>
      <StepHeader>
        <StepTitle>Qual é seu objetivo?</StepTitle>
        <StepSubtitle>O que você pretende alcançar com a dieta?</StepSubtitle>
      </StepHeader>

      <StepContent>
        <Controller
          control={form.control}
          name="goal"
          render={({ field, fieldState }) => (
            <RadioGroup
              accessibilityLabel="Objetivo"
              value={field.value}
              onChangeValue={value => {
                field.onChange(value);
                form.trigger('goal');
              }}
              error={!!fieldState.error}
              errorMessage={fieldState.error?.message || 'Selecione uma opção para continuar.'}
            >
              <RadioGroupItem value={Goal.LOSE} accessibilityLabel="Perder peso">
                <RadioGroupIcon>🥦</RadioGroupIcon>
                <RadioGroupLabel>Perder peso</RadioGroupLabel>
              </RadioGroupItem>
              <RadioGroupItem value={Goal.MAINTAIN} accessibilityLabel="Manter o peso">
                <RadioGroupIcon>🍍</RadioGroupIcon>
                <RadioGroupLabel>Manter o peso</RadioGroupLabel>
              </RadioGroupItem>
              <RadioGroupItem value={Goal.GAIN} accessibilityLabel="Ganhar peso">
                <RadioGroupIcon>🥩</RadioGroupIcon>
                <RadioGroupLabel>Ganhar peso</RadioGroupLabel>
              </RadioGroupItem>
            </RadioGroup>
          )}
        />
      </StepContent>

      <StepFooter>
        <Button size="icon" accessibilityLabel="Avançar" onPress={handleNextStep}>
          <ArrowRightIcon size={20} color={theme.colors.black[700]} />
        </Button>
      </StepFooter>
    </Step>
  );
}
