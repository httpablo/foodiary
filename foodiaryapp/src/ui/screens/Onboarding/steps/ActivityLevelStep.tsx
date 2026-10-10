import { ActivityLevel } from '@app/types/ActivityLevel';
import { Button } from '@ui/components/Button';
import {
  RadioGroup,
  RadioGroupDescription,
  RadioGroupIcon,
  RadioGroupItem,
  RadioGroupItemInfo,
  RadioGroupLabel,
} from '@ui/components/RadioGroup';
import { theme } from '@ui/styles/theme';
import { ArrowRightIcon } from 'lucide-react-native';
import { Controller, useFormContext } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Step, StepFooter, StepHeader, StepTitle } from '../components/Step';
import { useOnboarding } from '../context/useOnboarding';
import { OnboardingSchema } from '../schema';

export function ActivityLevelStep() {
  const { nextStep } = useOnboarding();
  const form = useFormContext<OnboardingSchema>();

  async function handleNextStep() {
    const isValid = await form.trigger('activityLevel');

    if (isValid) {
      nextStep();
    }
  }

  return (
    <Step>
      <StepHeader>
        <StepTitle>Qual seu nível de atividade?</StepTitle>
      </StepHeader>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.spacer} />
        <Controller
          control={form.control}
          name="activityLevel"
          render={({ field, fieldState }) => (
            <RadioGroup
              value={field.value}
              onChangeValue={value => {
                field.onChange(value);
                form.trigger('activityLevel');
              }}
              error={!!fieldState.error}
            >
              <RadioGroupItem value={ActivityLevel.SEDENTARY}>
                <RadioGroupIcon>🛋️</RadioGroupIcon>
                <RadioGroupItemInfo>
                  <RadioGroupLabel>Sedentário</RadioGroupLabel>
                  <RadioGroupDescription>Pouco ou nenhum exercício</RadioGroupDescription>
                </RadioGroupItemInfo>
              </RadioGroupItem>

              <RadioGroupItem value={ActivityLevel.LIGHT}>
                <RadioGroupIcon>🥬</RadioGroupIcon>
                <RadioGroupItemInfo>
                  <RadioGroupLabel>Leve</RadioGroupLabel>
                  <RadioGroupDescription>Exercício leve 1-2x por semana</RadioGroupDescription>
                </RadioGroupItemInfo>
              </RadioGroupItem>

              <RadioGroupItem value={ActivityLevel.MODERATE}>
                <RadioGroupIcon>⚡</RadioGroupIcon>
                <RadioGroupItemInfo>
                  <RadioGroupLabel>Moderado</RadioGroupLabel>
                  <RadioGroupDescription>Exercício moderado 3-5x por semana</RadioGroupDescription>
                </RadioGroupItemInfo>
              </RadioGroupItem>

              <RadioGroupItem value={ActivityLevel.HEAVY}>
                <RadioGroupIcon>🔥</RadioGroupIcon>
                <RadioGroupItemInfo>
                  <RadioGroupLabel>Intenso</RadioGroupLabel>
                  <RadioGroupDescription>Exercício intenso 6-7x por semana</RadioGroupDescription>
                </RadioGroupItemInfo>
              </RadioGroupItem>

              <RadioGroupItem value={ActivityLevel.ATHLETE}>
                <RadioGroupIcon>🏋️</RadioGroupIcon>
                <RadioGroupItemInfo>
                  <RadioGroupLabel>Atleta</RadioGroupLabel>
                  <RadioGroupDescription>Treino profissional diário</RadioGroupDescription>
                </RadioGroupItemInfo>
              </RadioGroupItem>
            </RadioGroup>
          )}
        />
      </ScrollView>

      <StepFooter>
        <Button size="icon" onPress={handleNextStep}>
          <ArrowRightIcon size={20} color={theme.colors.black[700]} />
        </Button>
      </StepFooter>
    </Step>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  spacer: {
    flexGrow: 1,
    minHeight: 24,
  },
});
