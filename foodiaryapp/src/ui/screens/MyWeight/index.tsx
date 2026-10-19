import { WeightGoal, WeightGoalTrackStatus } from '@app/types/WeightGoal';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { Input } from '@ui/components/Input';
import { WeightChart } from '@ui/components/WeightChart';
import { WeightGoalProgressBar } from '@ui/components/WeightGoalProgress';
import { theme } from '@ui/styles/theme';
import { formatDecimal } from '@ui/utils/formatDecimal';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { formatFullDate, formatKg, formatNumber, formatShortDate, formatSignedKg } from './format';
import { styles } from './styles';
import { formatDateMask, useMyWeightController } from './useMyWeightController';

const trackStatusLabels: Record<WeightGoalTrackStatus, string> = {
  AHEAD: 'Você está adiantado',
  ON_TRACK: 'Você está no ritmo',
  BEHIND: 'Você está um pouco atrás',
  OFF_TRACK: 'Sua tendência está na direção contrária',
  NOT_ENOUGH_DATA: 'Registre seu peso por pelo menos uma semana para ver a previsão',
};

function GoalHero({ weightGoal, currentWeight }: { weightGoal: WeightGoal; currentWeight: number }) {
  const { progress, direction } = weightGoal;
  const verb = direction === 'LOSE' ? 'perder' : 'ganhar';

  return (
    <View style={styles.heroCard}>
      <AppText size="xl" weight="semiBold">
        Rumo a{' '}
        {formatKg(weightGoal.targetWeight)}
      </AppText>

      <WeightGoalProgressBar weightGoal={weightGoal} currentWeight={currentWeight} />

      <AppText weight="medium">
        {progress.remainingKg > 0
          ? `Faltam ${formatKg(progress.remainingKg)} para ${verb}`
          : 'Você chegou ao seu peso alvo'}
      </AppText>

      <View>
        <AppText size="sm" weight="medium">{trackStatusLabels[progress.trackStatus]}</AppText>
        {progress.projectedDate && progress.trackStatus !== 'OFF_TRACK' && (
          <AppText size="sm">
            {`No ritmo atual, você chega lá por volta de ${formatShortDate(progress.projectedDate)}`}
          </AppText>
        )}
        <AppText size="sm" color={theme.colors.black[600]}>
          {`Previsto no plano: ${formatShortDate(progress.plannedDate)}`}
        </AppText>
      </View>
    </View>
  );
}

export function MyWeight() {
  const c = useMyWeightController();
  const { weightGoal, weightLogs, feedback } = c;

  const trend = c.overview?.trendWeight ?? null;
  const variationColor = !weightGoal
    ? theme.colors.black[700]
    : c.variationTowardTarget ? theme.colors.supportText.green : theme.colors.black[700];
  const needsAdjustment = !!weightLogs?.shouldSuggestAdjustment;
  const isManual = weightLogs?.goalSource === 'MANUAL';

  return (
    <View style={[styles.container, { paddingTop: c.top }]}>
      <AppHeader title="Meu peso" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: c.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            refreshing={c.isRefreshing}
            onRefresh={() => { void c.refresh(); }}
          />
        )}
      >
        {feedback && (
          <View
            style={[
              styles.feedbackBanner,
              feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <AppText
              size="sm"
              color={feedback.type === 'error' ? theme.colors.support.red : theme.colors.lime[900]}
            >
              {feedback.message}
            </AppText>
          </View>
        )}

        {c.isLoading ? (
          <ActivityIndicator style={styles.loading} color={theme.colors.lime[700]} />
        ) : c.isError || !weightLogs ? (
          <View style={styles.errorCard}>
            <AppText weight="medium">Não foi possível carregar seu peso.</AppText>
            <Button variant="secondary" onPress={() => { void c.refresh(); }}>Tentar novamente</Button>
          </View>
        ) : (
          <>
            {/* Hero */}
            {weightGoal?.status === 'ACHIEVED' ? (
              <View style={styles.celebrationCard} accessibilityRole="summary">
                <AppText size="xl" weight="semiBold">Meta alcançada!</AppText>
                <AppText>
                  {`Você chegou aos ${formatKg(weightGoal.targetWeight)}. Foi uma jornada de ${formatKg(weightGoal.progress.totalKg)}. Parabéns!`}
                </AppText>
                <View style={styles.actionsRow}>
                  <Button onPress={() => c.navigate('WeightGoalSetup')} accessibilityLabel="Definir nova meta">
                    Definir nova meta
                  </Button>
                  <Button
                    variant="secondary"
                    isLoading={c.isEndingWeightGoal}
                    onPress={() => { void c.handleKeepWeight(); }}
                    accessibilityLabel="Manter meu peso"
                  >
                    Manter meu peso
                  </Button>
                </View>
              </View>
            ) : weightGoal ? (
              <GoalHero weightGoal={weightGoal} currentWeight={c.currentWeight} />
            ) : (
              <View style={styles.emptyCard}>
                <AppText size="lg" weight="semiBold">Defina uma meta de peso</AppText>
                <AppText color={theme.colors.gray[700]}>
                  Escolha o peso que quer alcançar e o ritmo. Suas metas diárias de calorias e macros acompanham o plano, e você vê o progresso e a data estimada para chegar lá.
                </AppText>
                <Button onPress={() => c.navigate('WeightGoalSetup')} accessibilityLabel="Definir meta de peso">
                  Definir meta de peso
                </Button>
              </View>
            )}

            {/* Quick log */}
            <View style={styles.card}>
              <AppText size="lg" weight="semiBold">Registrar peso</AppText>
              <View style={styles.logForm}>
                <Input
                  placeholder="Seu peso (ex: 74,5)"
                  suffix="kg"
                  keyboardType="decimal-pad"
                  value={c.weightInput}
                  onChangeText={c.setWeightInput}
                  formatter={formatDecimal}
                  accessibilityLabel="Peso (kg)"
                />
                <View style={styles.dateRow}>
                  <AppText size="sm" color={theme.colors.gray[700]}>
                    {c.isCustomDate ? 'Data do registro' : 'Data: hoje'}
                  </AppText>
                  <Pressable
                    onPress={() => c.setIsCustomDate(!c.isCustomDate)}
                    style={styles.linkButton}
                    accessibilityRole="button"
                    accessibilityLabel={c.isCustomDate ? 'Usar a data de hoje' : 'Escolher outra data'}
                  >
                    <AppText size="sm" weight="medium" color={theme.colors.lime[700]}>
                      {c.isCustomDate ? 'Usar hoje' : 'Outra data'}
                    </AppText>
                  </Pressable>
                </View>
                {c.isCustomDate && (
                  <Input
                    placeholder="DD/MM/AAAA"
                    keyboardType="number-pad"
                    value={c.dateInput}
                    onChangeText={c.setDateInput}
                    formatter={formatDateMask}
                    accessibilityLabel="Data do registro (DD/MM/AAAA)"
                  />
                )}
                <Button
                  onPress={() => { void c.handleLogWeight(); }}
                  isLoading={c.isLoggingWeight}
                  accessibilityLabel="Registrar peso"
                >
                  Registrar
                </Button>
              </View>
            </View>

            {/* Chart */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <AppText size="lg" weight="semiBold">Evolução</AppText>
                <View style={styles.periodToggle}>
                  {([30, 90] as const).map(option => (
                    <Pressable
                      key={option}
                      onPress={() => c.setPeriod(option)}
                      style={[styles.periodChip, c.period === option && styles.periodChipSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: c.period === option }}
                      accessibilityLabel={`Últimos ${option} dias`}
                    >
                      <AppText size="sm" weight="medium">{option} dias</AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <WeightChart
                points={c.chartPoints}
                targetWeight={weightGoal && weightGoal.status === 'ACTIVE' ? weightGoal.targetWeight : undefined}
              />
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <AppText size="xs" color={theme.colors.gray[700]} numberOfLines={1}>Atual</AppText>
                <AppText weight="semiBold" numberOfLines={1}>{formatKg(c.currentWeight)}</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText size="xs" color={theme.colors.gray[700]} numberOfLines={1}>Tendência</AppText>
                <AppText weight="semiBold" numberOfLines={1}>{trend !== null ? formatKg(trend) : '—'}</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText size="xs" color={theme.colors.gray[700]} numberOfLines={1}>Desde o início</AppText>
                <AppText weight="semiBold" numberOfLines={1} color={variationColor}>
                  {formatSignedKg(c.variation)}
                </AppText>
              </View>
            </View>

            {/* Adjustment */}
            {(needsAdjustment || isManual) && (
              <View style={styles.card}>
                <AppText size="lg" weight="semiBold">Metas diárias</AppText>
                {needsAdjustment && (
                  <>
                    <AppText size="sm" color={theme.colors.gray[700]}>
                      {`Seu peso mudou para ${formatKg(c.currentWeight)}. Atualize suas metas diárias para acompanhar:`}
                    </AppText>
                    <View style={styles.comparisonRow}>
                      <View style={styles.comparisonColumn}>
                        <AppText size="xs" color={theme.colors.gray[700]}>Meta atual</AppText>
                        <AppText weight="semiBold">{formatNumber(weightLogs.currentGoal.calories, 0)} kcal</AppText>
                        <AppText size="xs" color={theme.colors.gray[700]}>
                          {`${formatNumber(weightLogs.currentGoal.proteins, 0)}g P • ${formatNumber(weightLogs.currentGoal.carbohydrates, 0)}g C • ${formatNumber(weightLogs.currentGoal.fats, 0)}g G`}
                        </AppText>
                      </View>
                      <View style={styles.comparisonColumn}>
                        <AppText size="xs" color={theme.colors.gray[700]}>Nova meta</AppText>
                        <AppText weight="semiBold">{formatNumber(weightLogs.suggestedGoal.calories, 0)} kcal</AppText>
                        <AppText size="xs" color={theme.colors.gray[700]}>
                          {`${formatNumber(weightLogs.suggestedGoal.proteins, 0)}g P • ${formatNumber(weightLogs.suggestedGoal.carbohydrates, 0)}g C • ${formatNumber(weightLogs.suggestedGoal.fats, 0)}g G`}
                        </AppText>
                      </View>
                    </View>
                    <Button
                      variant="secondary"
                      isLoading={c.isRecalculatingGoals}
                      onPress={() => { void c.handleRecalculate(); }}
                      accessibilityLabel="Atualizar metas diárias"
                    >
                      Atualizar metas
                    </Button>
                  </>
                )}
                {isManual && (
                  <View style={styles.noteCard}>
                    <AppText size="sm" color={theme.colors.gray[700]}>
                      Você definiu suas metas diárias manualmente. Elas não mudam quando seu peso muda.
                    </AppText>
                    <Button
                      variant="secondary"
                      disabled={c.isRecalculatingGoals}
                      onPress={() => { void c.handleBackToAutomatic(); }}
                      accessibilityLabel="Calcular metas pelo meu peso"
                    >
                      Calcular metas pelo meu peso
                    </Button>
                  </View>
                )}
              </View>
            )}

            {/* History */}
            <View style={styles.card}>
              <AppText size="lg" weight="semiBold">Histórico</AppText>
              {c.historyRows.length === 0 ? (
                <AppText size="sm" color={theme.colors.gray[700]}>Nenhum registro ainda.</AppText>
              ) : (
                <View style={styles.historyList}>
                  {c.historyRows.map(entry => (
                    <View key={entry.id} style={styles.historyItem}>
                      <AppText size="sm" color={theme.colors.gray[700]}>{formatFullDate(entry.date)}</AppText>
                      <View style={styles.historyValues}>
                        {entry.delta !== null && Math.abs(entry.delta) >= 0.05 && (
                          <AppText size="xs" color={theme.colors.gray[700]}>{formatSignedKg(entry.delta)}</AppText>
                        )}
                        <AppText size="sm" weight="semiBold">{formatKg(entry.weight)}</AppText>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {c.hasMoreHistory && (
                <Button variant="secondary" onPress={c.showMoreHistory} accessibilityLabel="Ver mais registros">
                  Ver mais
                </Button>
              )}
            </View>

            {/* Footer actions */}
            {weightGoal?.status === 'ACTIVE' && (
              <View style={styles.footerActions}>
                <View style={styles.footerAction}>
                  <Button variant="secondary" onPress={() => c.navigate('WeightGoalSetup')}>Editar meta</Button>
                </View>
                <View style={styles.footerAction}>
                  <Button
                    variant="secondary"
                    isLoading={c.isEndingWeightGoal}
                    onPress={() => { void c.handleEndGoal(); }}
                  >
                    Encerrar meta
                  </Button>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
