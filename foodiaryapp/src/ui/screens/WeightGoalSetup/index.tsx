import { WeightGoalPaceKey } from '@app/types/WeightGoal';
import { WeightGoalSummary } from '@app/types/WeightLog';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { FormGroup } from '@ui/components/FormGroup';
import { Input } from '@ui/components/Input';
import { formatKg, formatNumber, formatShortDate } from '@ui/screens/MyWeight/format';
import { theme } from '@ui/styles/theme';
import { formatDecimal } from '@ui/utils/formatDecimal';
import { CheckIcon } from 'lucide-react-native';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { styles } from './styles';
import { useWeightGoalSetupController } from './useWeightGoalSetupController';

const paceLabels: Record<WeightGoalPaceKey, string> = {
  RELAXED: 'Tranquilo',
  RECOMMENDED: 'Moderado',
  AGGRESSIVE: 'Acelerado',
};

const stepTitles = {
  1: 'Qual peso você quer alcançar?',
  2: 'Em que ritmo?',
  3: 'Revise suas novas metas',
} as const;

function formatDiff(value: number, unit: string) {
  if (value === 0) {
    return 'sem alteração';
  }
  return `${value > 0 ? '+' : ''}${formatNumber(value, 0)} ${unit}`;
}

function DailyGoalCompare({ current, next }: { current: WeightGoalSummary; next: WeightGoalSummary }) {
  const rows: { label: string; unit: string; key: keyof WeightGoalSummary }[] = [
    { label: 'Calorias', unit: 'kcal', key: 'calories' },
    { label: 'Proteínas', unit: 'g', key: 'proteins' },
    { label: 'Carboidratos', unit: 'g', key: 'carbohydrates' },
    { label: 'Gorduras', unit: 'g', key: 'fats' },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.comparisonRow}>
        <View style={styles.comparisonColumn}>
          <AppText size="xs" color={theme.colors.gray[700]}>Meta diária atual</AppText>
        </View>
        <View style={styles.comparisonColumn}>
          <AppText size="xs" color={theme.colors.gray[700]}>Nova meta diária</AppText>
        </View>
      </View>
      {rows.map((row) => {
        const diff = next[row.key] - current[row.key];
        return (
          <View key={row.key} style={{ gap: 2 }}>
            <AppText size="sm" weight="medium">{row.label}</AppText>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonColumn}>
                <AppText color={theme.colors.gray[700]}>
                  {formatNumber(current[row.key], 0)} {row.unit}
                </AppText>
              </View>
              <View style={styles.comparisonColumn}>
                <AppText weight="semiBold">{formatNumber(next[row.key], 0)} {row.unit}</AppText>
                <AppText
                  size="xs"
                  weight="medium"
                  color={theme.colors.gray[700]}
                >
                  {formatDiff(diff, row.unit)}
                </AppText>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function WeightGoalSetup() {
  const c = useWeightGoalSetupController();
  const { preview, selectedOption } = c;

  const difference = c.target !== undefined && c.currentWeight !== undefined
    ? c.target - c.currentWeight
    : null;
  const directionLabel = difference === null || Math.abs(difference) < 0.05
    ? null
    : difference < 0
      ? `Perder ${formatKg(Math.abs(difference))}`
      : `Ganhar ${formatKg(difference)}`;

  const canContinue = c.step === 1
    ? c.canContinueFromWeight
    : c.step === 2
      ? !!selectedOption
      : !!selectedOption && !c.isSubmitting;

  function handlePrimary() {
    if (c.step === 3) {
      void c.handleConfirm();
      return;
    }
    c.goNextStep();
  }

  return (
    <View style={[styles.container, { paddingTop: c.top }]}>
      <AppHeader title={c.isEditing ? 'Editar meta de peso' : 'Meta de peso'} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {c.isLoading ? (
          <ActivityIndicator style={styles.loading} color={theme.colors.lime[700]} />
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.stepIndicator} accessibilityLabel={`Passo ${c.step} de 3`}>
              <View style={styles.stepBars}>
                {[1, 2, 3].map(index => (
                  <View key={index} style={[styles.stepBar, index <= c.step && styles.stepBarActive]} />
                ))}
              </View>
              <AppText size="xs" color={theme.colors.gray[700]}>Passo {c.step} de 3</AppText>
            </View>

            <AppText size="xl" weight="semiBold" accessibilityRole="header">{stepTitles[c.step]}</AppText>

            {c.step === 1 && (
              <>
                <FormGroup label="Peso desejado" error={c.inputError ?? c.previewError ?? undefined}>
                  <Input
                    placeholder="Ex: 68,5"
                    suffix="kg"
                    keyboardType="decimal-pad"
                    value={c.targetInput}
                    onChangeText={c.setTargetInput}
                    formatter={formatDecimal}
                    autoFocus={!c.isEditing}
                  />
                </FormGroup>

                <View style={styles.directionLabel} accessibilityLiveRegion="polite">
                  {c.isCalculating ? (
                    <AppText size="sm" color={theme.colors.gray[700]}>Calculando...</AppText>
                  ) : directionLabel && !c.previewError && !c.inputError ? (
                    <AppText weight="semiBold" color={theme.colors.lime[900]}>{directionLabel}</AppText>
                  ) : null}
                </View>

                <View style={styles.hintCard}>
                  {c.currentWeight !== undefined && (
                    <AppText size="sm">Peso atual: <AppText size="sm" weight="semiBold">{formatKg(c.currentWeight)}</AppText></AppText>
                  )}
                  {c.healthyRange && (
                    <AppText size="sm" color={theme.colors.gray[700]}>
                      {`Faixa saudável para a sua altura: ${formatNumber(c.healthyRange.min)} a ${formatKg(c.healthyRange.max)}`}
                    </AppText>
                  )}
                </View>

                {preview && preview.warnings.length > 0 && (
                  <View style={{ gap: 8 }}>
                    {preview.warnings.map(warning => (
                      <View key={warning} style={styles.warningCard}>
                        <AppText size="sm">{warning}</AppText>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {c.step === 2 && preview && (
              <>
                {preview.warnings.map(warning => (
                  <View key={warning} style={styles.warningCard}>
                    <AppText size="sm">{warning}</AppText>
                  </View>
                ))}
                {preview.options.map((option) => {
                  const isSelected = selectedOption?.key === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => c.setSelectedKey(option.key)}
                      style={[styles.paceCard, isSelected && styles.paceCardSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${paceLabels[option.key]}: ${formatNumber(option.paceKgPerWeek, 2)} quilos por semana, ${formatNumber(option.dailyGoal.calories, 0)} calorias por dia, cerca de ${option.weeks} semanas`}
                    >
                      <View style={styles.paceHeader}>
                        <AppText weight="semiBold">{paceLabels[option.key]}</AppText>
                        {option.key === 'RECOMMENDED' && (
                          <View style={styles.badge}>
                            <AppText size="xs" weight="semiBold" color={theme.colors.lime[900]}>Recomendado</AppText>
                          </View>
                        )}
                      </View>
                      <AppText size="lg" weight="semiBold">{formatNumber(option.paceKgPerWeek, 2)} kg/semana</AppText>
                      <AppText size="sm">{formatNumber(option.dailyGoal.calories, 0)} kcal/dia</AppText>
                      <AppText size="sm" color={theme.colors.gray[700]}>
                        {`~${option.weeks} semanas · até ${formatShortDate(option.estimatedDate)}`}
                      </AppText>
                    </Pressable>
                  );
                })}
              </>
            )}

            {c.step === 3 && preview && selectedOption && (
              <>
                <View style={styles.summaryCard}>
                  <AppText size="xs" weight="medium">META DE PESO</AppText>
                  <AppText size="2xl" weight="semiBold">{formatKg(preview.targetWeight)}</AppText>
                  {c.currentWeight !== undefined && (
                    <AppText size="sm">
                      {`${directionLabel ?? 'Meta'} · de ${formatKg(c.currentWeight)} para ${formatKg(preview.targetWeight)}`}
                    </AppText>
                  )}
                  <AppText size="sm">
                    {`${paceLabels[selectedOption.key]} · ${formatNumber(selectedOption.paceKgPerWeek, 2)} kg/semana · até ${formatShortDate(selectedOption.estimatedDate)}`}
                  </AppText>
                </View>

                <DailyGoalCompare current={preview.currentDailyGoal} next={selectedOption.dailyGoal} />

                <Pressable
                  onPress={() => c.setApplyToDailyGoals(!c.applyToDailyGoals)}
                  style={styles.toggleRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: c.applyToDailyGoals }}
                  accessibilityLabel="Atualizar minhas metas diárias"
                >
                  <View style={[styles.checkbox, c.applyToDailyGoals && styles.checkboxChecked]}>
                    {c.applyToDailyGoals && <CheckIcon size={16} color={theme.colors.white} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText weight="medium">Atualizar minhas metas diárias</AppText>
                    <AppText size="xs" color={theme.colors.gray[700]}>
                      Se desmarcar, suas metas diárias atuais serão mantidas.
                    </AppText>
                  </View>
                </Pressable>

                {c.submitError && (
                  <View style={styles.feedbackBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
                    <AppText size="sm" color={theme.colors.support.red}>{c.submitError}</AppText>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}

        <View style={[styles.footer, { paddingBottom: c.bottom + 20 }]}>
          <View style={styles.footerAction}>
            <Button variant="secondary" onPress={c.goBackStep} disabled={c.isSubmitting} style={styles.footerButton}>
              {c.step === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
          </View>
          <View style={styles.footerAction}>
            <Button
              onPress={handlePrimary}
              disabled={!canContinue}
              isLoading={c.isSubmitting}
              style={styles.footerButton}
            >
              {c.step === 3 ? 'Confirmar' : 'Continuar'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
