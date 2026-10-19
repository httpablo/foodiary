import { ArrowRightIcon } from 'lucide-react-native';

import { Goal } from '@app/types/Goal';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { FormGroup } from '@ui/components/FormGroup';
import { Input } from '@ui/components/Input';
import { theme } from '@ui/styles/theme';
import { formatDecimal } from '@ui/utils/formatDecimal';
import { parseDecimal } from '@ui/utils/parseDecimal';
import { Controller, useFormContext } from 'react-hook-form';
import { View } from 'react-native';
import { Step, StepContent, StepFooter, StepHeader, StepSubtitle, StepTitle } from '../components/Step';
import { useOnboarding } from '../context/useOnboarding';
import { OnboardingSchema } from '../schema';

const MIN_BMI = 18.5;
const MAX_BMI = 24.9;
const MIN_DIFFERENCE_KG = 0.5;

const formatKg = (value: number) => Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);

export function TargetWeightStep() {
  const { nextStep } = useOnboarding();
  const form = useFormContext<OnboardingSchema>();

  const goal = form.watch('goal');
  const heightMeters = parseDecimal(form.watch('height')) / 100;
  const hasHeight = Number.isFinite(heightMeters) && heightMeters > 0;
  const healthyRange = hasHeight ? {
    min: Number((MIN_BMI * heightMeters ** 2).toFixed(1)),
    max: Number((MAX_BMI * heightMeters ** 2).toFixed(1)),
  } : null;

  function validate(): string | null {
    const raw = form.getValues('targetWeight')?.trim();
    if (!raw) {
      return null;
    }

    const target = parseDecimal(raw);
    const weight = parseDecimal(form.getValues('weight'));
    if (!Number.isFinite(target) || target < 30 || target > 700) {
      return 'Informe um peso entre 30 e 700 kg';
    }
    if (goal === Goal.LOSE && target >= weight - MIN_DIFFERENCE_KG) {
      return 'Para perder peso, o peso desejado deve ser menor que o atual';
    }
    if (goal === Goal.GAIN && target <= weight + MIN_DIFFERENCE_KG) {
      return 'Para ganhar peso, o peso desejado deve ser maior que o atual';
    }
    if (hasHeight && target / heightMeters ** 2 < MIN_BMI) {
      return 'Esse peso está abaixo da faixa saudável para a sua altura';
    }
    return null;
  }

  function handleNextStep() {
    const error = validate();

    if (error) {
      form.setError('targetWeight', { message: error });
      return;
    }

    form.clearErrors('targetWeight');
    nextStep();
  }

  function handleSkip() {
    form.setValue('targetWeight', '');
    form.clearErrors('targetWeight');
    nextStep();
  }

  return (
    <Step>
      <StepHeader>
        <StepTitle>Qual peso você quer alcançar?</StepTitle>
        <StepSubtitle>Opcional. Você pode definir ou mudar essa meta depois.</StepSubtitle>
      </StepHeader>

      <StepContent position="center">
        <Controller
          control={form.control}
          name="targetWeight"
          render={({ field, fieldState }) => (
            <FormGroup
              label="Peso desejado"
              style={{ width: '100%' }}
              error={fieldState.error?.message}
            >
              <Input
                autoFocus
                placeholder="70"
                suffix="kg"
                accessibilityLabel="Peso desejado em quilogramas"
                keyboardType="numeric"
                formatter={formatDecimal}
                value={field.value ?? ''}
                onChangeText={(value) => {
                  form.clearErrors('targetWeight');
                  field.onChange(value);
                }}
              />
            </FormGroup>
          )}
        />

        {healthyRange && (
          <AppText size="sm" color={theme.colors.gray[700]}>
            Faixa saudável para a sua altura: {formatKg(healthyRange.min)} a {formatKg(healthyRange.max)} kg
          </AppText>
        )}
      </StepContent>

      <StepFooter>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button variant="ghost" accessibilityLabel="Pular" onPress={handleSkip}>Pular</Button>
          <Button size="icon" accessibilityLabel="Avançar" onPress={handleNextStep}>
            <ArrowRightIcon size={20} color={theme.colors.black[700]} />
          </Button>
        </View>
      </StepFooter>
    </Step>
  );
}
