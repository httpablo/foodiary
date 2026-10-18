import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { DateInput } from '@ui/components/DateInput';
import { theme } from '@ui/styles/theme';
import { ArrowRightIcon } from 'lucide-react-native';
import { Controller, useFormContext } from 'react-hook-form';
import { View } from 'react-native';

import { Step, StepContent, StepFooter, StepHeader, StepSubtitle, StepTitle } from '../components/Step';
import { useOnboarding } from '../context/useOnboarding';
import { OnboardingSchema } from '../schema';

export function BirthDateStep() {
  const { nextStep } = useOnboarding();
  const form = useFormContext<OnboardingSchema>();

  async function handleNextStep() {
    if (await form.trigger('birthDate')) {
      nextStep();
    }
  }

  return (
    <Step>
      <StepHeader>
        <StepTitle>Que dia você nasceu?</StepTitle>
        <StepSubtitle>Informe sua data de nascimento</StepSubtitle>
      </StepHeader>

      <StepContent position="center">
        <View style={{ width: '100%', gap: 8 }}>
          <Controller
            control={form.control}
            name="birthDate"
            render={({ field, fieldState }) => (
              <>
                <DateInput
                  value={field.value}
                  onChange={date => form.setValue('birthDate', date, {
                    shouldDirty: true,
                    shouldValidate: !!fieldState.error,
                  })}
                  error={!!fieldState.error}
                />
                {fieldState.error && (
                  <AppText
                    size="sm"
                    color={theme.colors.support.red}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    {fieldState.error.message}
                  </AppText>
                )}
              </>
            )}
          />
        </View>
      </StepContent>

      <StepFooter>
        <Button size="icon" accessibilityLabel="Avançar" onPress={handleNextStep}>
          <ArrowRightIcon size={20} color={theme.colors.black[700]} />
        </Button>
      </StepFooter>
    </Step>
  );
}
