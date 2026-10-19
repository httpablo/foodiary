import { useLogWeight } from '@app/hooks/mutations/useLogWeight';
import { useUpdateGoals } from '@app/hooks/mutations/useUpdateGoals';
import { useAccount } from '@app/hooks/queries/useAccount';
import { useWeeklySummary } from '@app/hooks/queries/useWeeklySummary';
import { useWeightLogs } from '@app/hooks/queries/useWeightLogs';
import { NutritionTotals } from '@app/types/WeeklySummary';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { Input } from '@ui/components/Input';
import { theme } from '@ui/styles/theme';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';

type Metric = keyof NutritionTotals;

const metrics: { key: Metric; shortLabel: string; label: string; unit: string; color: string }[] = [
  { key: 'calories', shortLabel: 'Calorias', label: 'Calorias', unit: 'kcal', color: theme.colors.support.tomato },
  { key: 'proteins', shortLabel: 'Proteínas', label: 'Proteínas', unit: 'g', color: theme.colors.support.teal },
  { key: 'carbohydrates', shortLabel: 'Carbo.', label: 'Carboidratos', unit: 'g', color: theme.colors.support.yellow },
  { key: 'fats', shortLabel: 'Gorduras', label: 'Gorduras', unit: 'g', color: theme.colors.support.orange },
];

const formatNumber = (value: number) => Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);

function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function formatWeek(start: Date): string {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const month = Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(end);
    return `${start.getDate()}–${end.getDate()} DE ${month}`.toUpperCase();
  }
  const first = Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(start);
  const last = Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(end);
  return `${first} – ${last}`.toUpperCase();
}

function formatDay(date: string): string {
  const local = new Date(`${date}T12:00:00`);
  const weekday = Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(local).replace('.', '');
  return `${weekday.toUpperCase()} ${date.slice(8)}`;
}

function formatFullDate(date: string): string {
  const local = new Date(`${date}T12:00:00`);
  return Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(local);
}

export function WeeklySummaryScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const { account } = useAccount();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedMetric, setSelectedMetric] = useState<Metric>('calories');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightFeedback, setWeightFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { summary, isLoading, isRefetching, isError, refetch } = useWeeklySummary(weekStart);
  const {
    weightLogs,
    isRefetching: isRefetchingWeights,
    refetch: refetchWeightLogs,
  } = useWeightLogs(14);
  const { logWeight, isLoggingWeight } = useLogWeight();
  const { updateGoals, isLoading: isUpdatingGoals } = useUpdateGoals();
  const currentWeek = formatDateToAPI(startOfWeek(new Date()));
  const canGoForward = formatDateToAPI(weekStart) < currentWeek;
  const metric = metrics.find(item => item.key === selectedMetric)!;
  const goal = account?.goal[selectedMetric] ?? 0;
  const maxValue = Math.max(goal, ...(summary?.days.map(day => day.totals?.[selectedMetric] ?? 0) ?? []), 1) * 1.1;
  const goalPosition = `${(goal / maxValue) * 100}%` as const;
  const today = formatDateToAPI(new Date());
  const selectedDay = summary?.days.find(day => day.date === selectedDate)
    ?? summary?.days.find(day => day.date === today)
    ?? [...(summary?.days ?? [])].reverse().find(day => day.totals !== null)
    ?? summary?.days[0];

  const hasGoalDifference = weightLogs ? (
    weightLogs.currentGoal.calories !== weightLogs.suggestedGoal.calories
    || weightLogs.currentGoal.proteins !== weightLogs.suggestedGoal.proteins
    || weightLogs.currentGoal.carbohydrates !== weightLogs.suggestedGoal.carbohydrates
    || weightLogs.currentGoal.fats !== weightLogs.suggestedGoal.fats
  ) : false;

  function changeWeek(amount: number) {
    setSelectedDate(null);
    setWeekStart(previous => new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + amount * 7));
  }

  async function handleLogWeight() {
    setWeightFeedback(null);
    const parsed = Number(weightInput.trim().replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 700) {
      setWeightFeedback({
        type: 'error',
        message: 'Informe um peso válido entre 1 e 700 kg.',
      });
      return;
    }

    try {
      await logWeight({
        weight: Number(parsed.toFixed(2)),
        date: today,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      });
      setWeightInput('');
      setWeightFeedback({
        type: 'success',
        message: `Peso de hoje (${formatNumber(parsed)} kg) registrado com sucesso.`,
      });
    } catch {
      setWeightFeedback({
        type: 'error',
        message: 'Não foi possível registrar seu peso agora.',
      });
    }
  }

  async function handleApplySuggestedGoals() {
    if (!weightLogs) {
      return;
    }

    setWeightFeedback(null);
    try {
      await updateGoals(weightLogs.suggestedGoal);
      setWeightFeedback({
        type: 'success',
        message: `Metas diárias atualizadas para ${formatNumber(weightLogs.suggestedGoal.calories)} kcal.`,
      });
    } catch {
      setWeightFeedback({
        type: 'error',
        message: 'Não foi possível aplicar as metas sugeridas.',
      });
    }
  }

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <AppHeader title="Resumo Semanal" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]}
        refreshControl={(
          <RefreshControl
            refreshing={isRefetching || isRefetchingWeights}
            onRefresh={() => {
              void refetch();
              void refetchWeightLogs();
            }}
          />
        )}
      >
        <View style={styles.weekSwitcher}>
          <Button size="icon" variant="ghost" onPress={() => changeWeek(-1)} accessibilityLabel="Semana anterior">
            <ChevronLeftIcon size={22} color={theme.colors.black[700]} />
          </Button>
          <AppText weight="medium" align="center" style={styles.weekLabel}>{formatWeek(weekStart)}</AppText>
          <Button size="icon" variant="ghost" onPress={() => changeWeek(1)} disabled={!canGoForward} accessibilityLabel="Próxima semana">
            <ChevronRightIcon size={22} color={theme.colors.black[700]} />
          </Button>
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.loading} color={theme.colors.lime[700]} />
        ) : isError || !summary ? (
          <View style={styles.errorCard}>
            <AppText weight="medium">Não foi possível carregar a semana.</AppText>
            <Button variant="secondary" onPress={() => refetch()}>Tentar novamente</Button>
          </View>
        ) : (
          <>
            <View style={styles.intro}>
              <AppText size="2xl" weight="semiBold">Seu ritmo na semana</AppText>
              <AppText color={theme.colors.gray[700]}>
                Compare seus registros com as metas atuais.
              </AppText>
            </View>

            <View style={styles.heroCard}>
              <AppText weight="medium">Média nos dias registrados</AppText>
              <View style={styles.heroValueRow}>
                <AppText size="3xl" weight="semiBold">
                  {summary.averages ? formatNumber(summary.averages.calories) : '—'}
                </AppText>
                <AppText color={theme.colors.gray[700]}>kcal/dia</AppText>
              </View>
              <AppText size="sm" color={theme.colors.gray[700]}>
                {summary.recordedDays === 0
                  ? 'Nenhum dia com refeições registradas.'
                  : `${summary.recordedDays} ${summary.recordedDays === 1 ? 'dia com registro' : 'dias com registros'}.`}
              </AppText>
            </View>

            <View style={styles.section}>
              <AppText size="lg" weight="semiBold">Consumo por dia</AppText>
              <View style={styles.metricTabs}>
                {metrics.map(item => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedMetric === item.key }}
                    onPress={() => setSelectedMetric(item.key)}
                    style={[styles.metricTab, selectedMetric === item.key && styles.metricTabSelected]}
                  >
                    <AppText
                      size="xs"
                      weight="medium"
                      align="center"
                      color={selectedMetric === item.key ? theme.colors.black[700] : theme.colors.gray[700]}
                    >
                      {item.shortLabel}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              <View style={styles.chartCard}>
                <View style={styles.chartHeading}>
                  <AppText size="sm" weight="medium">{metric.label}</AppText>
                  <AppText size="xs" color={theme.colors.gray[700]}>
                    Meta: {formatNumber(goal)} {metric.unit}
                  </AppText>
                </View>
                <View style={styles.chartPlot}>
                  <View style={styles.columns}>
                    {summary.days.map(day => {
                      const value = day.totals?.[selectedMetric];
                      return (
                        <Pressable
                          key={day.date}
                          accessibilityRole="button"
                          accessibilityLabel={`${formatDay(day.date)}: ${value === undefined || value === null ? (day.date > today ? 'dia futuro' : 'sem registro') : `${formatNumber(value)} ${metric.unit}`}`}
                          accessibilityState={{ selected: selectedDay?.date === day.date }}
                          onPress={() => setSelectedDate(day.date)}
                          style={[styles.chartColumn, selectedDay?.date === day.date && styles.chartColumnSelected]}
                        >
                          {value !== undefined && value !== null ? (
                            <View style={[styles.columnFill, {
                              height: value === 0 ? 4 : `${(value / maxValue) * 100}%`,
                              backgroundColor: metric.color,
                            }]} />
                          ) : day.date <= today ? <View style={styles.missingMarker} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                  {goal > 0 && <View pointerEvents="none" style={[styles.goalLine, { bottom: goalPosition }]} />}
                </View>
                <View style={styles.dayLabels}>
                  {summary.days.map(day => (
                    <Pressable
                      key={day.date}
                      accessibilityRole="button"
                      accessibilityLabel={`Selecionar ${formatDay(day.date)}`}
                      accessibilityState={{ selected: selectedDay?.date === day.date }}
                      onPress={() => setSelectedDate(day.date)}
                      style={[styles.dayLabel, selectedDay?.date === day.date && styles.dayLabelSelected]}
                    >
                      <AppText size="xs" weight="medium" align="center" color={day.date > today ? theme.colors.gray[600] : theme.colors.gray[700]}>
                        {formatDay(day.date).split(' ')[0]}
                      </AppText>
                      <AppText size="xs" align="center" color={day.date > today ? theme.colors.gray[600] : theme.colors.black[700]}>
                        {day.date.slice(8)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                {selectedDay && (
                  <View style={styles.selectedDayCard}>
                    <AppText size="sm" weight="medium">{formatDay(selectedDay.date)}</AppText>
                    <AppText size="lg" weight="semiBold">
                      {selectedDay.totals
                        ? `${formatNumber(selectedDay.totals[selectedMetric])} ${metric.unit}`
                        : selectedDay.date > today ? 'Dia futuro' : 'Sem registro'}
                    </AppText>
                    {selectedDay.mealCount > 0 && (
                      <AppText size="xs" color={theme.colors.gray[700]}>
                        {selectedDay.mealCount} {selectedDay.mealCount === 1 ? 'refeição registrada' : 'refeições registradas'}
                      </AppText>
                    )}
                  </View>
                )}
                <AppText size="xs" color={theme.colors.gray[700]} style={styles.chartNote}>
                  Linha escura: meta. Traço cinza: sem registro. Toque em um dia para ver o valor.
                </AppText>
              </View>
            </View>

            <View style={styles.section}>
              <AppText size="lg" weight="semiBold">Médias e metas</AppText>
              <AppText size="sm" color={theme.colors.gray[700]}>
                Médias por dia com registro, comparadas às suas metas atuais.
              </AppText>
              <View style={styles.averagesCard}>
                {metrics.map(item => {
                  const average = summary.averages?.[item.key];
                  const currentGoal = account?.goal[item.key] ?? 0;
                  const progress = average === undefined || currentGoal <= 0
                    ? 0 : Math.min((average / currentGoal) * 100, 100);
                  return (
                    <View key={item.key} style={styles.averageRow}>
                      <View style={styles.averageHeading}>
                        <AppText weight="medium">{item.label}</AppText>
                        <AppText size="sm" color={theme.colors.gray[700]}>
                          {average === undefined ? '—' : formatNumber(average)} / {formatNumber(currentGoal)} {item.unit}
                        </AppText>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: item.color }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <AppText size="lg" weight="semiBold">Evolução de peso e metas</AppText>
              <AppText size="sm" color={theme.colors.gray[700]}>
                Registre seu peso de hoje e mantenha suas metas diárias sincronizadas.
              </AppText>

              {weightFeedback && (
                <View
                  style={[
                    styles.feedbackBanner,
                    weightFeedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
                  ]}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                >
                  <AppText
                    size="sm"
                    color={weightFeedback.type === 'error' ? theme.colors.support.red : theme.colors.lime[900]}
                  >
                    {weightFeedback.message}
                  </AppText>
                </View>
              )}

              <View style={styles.weightCard}>
                <View style={styles.weightStatsRow}>
                  <View style={styles.weightStatBox}>
                    <AppText size="xs" color={theme.colors.gray[700]} numberOfLines={1}>Peso atual</AppText>
                    <AppText size="base" weight="semiBold" numberOfLines={1}>
                      {formatNumber(weightLogs?.currentWeight ?? account?.profile.weight ?? 0)} kg
                    </AppText>
                  </View>
                  <View style={styles.weightStatBox}>
                    <AppText size="xs" color={theme.colors.gray[700]} numberOfLines={1}>Peso inicial</AppText>
                    <AppText size="base" weight="semiBold" numberOfLines={1}>
                      {formatNumber(weightLogs?.startWeight ?? account?.profile.weight ?? 0)} kg
                    </AppText>
                  </View>
                  <View style={styles.weightStatBox}>
                    <AppText size="xs" color={theme.colors.gray[700]} numberOfLines={1}>Variação</AppText>
                    <AppText
                      size="base"
                      weight="semiBold"
                      numberOfLines={1}
                      color={(weightLogs?.weightChange ?? 0) === 0 ? theme.colors.black[700] : theme.colors.lime[900]}
                    >
                      {(weightLogs?.weightChange ?? 0) > 0 ? '+' : ''}
                      {formatNumber(weightLogs?.weightChange ?? 0)} kg
                    </AppText>
                  </View>
                </View>

                <View style={styles.weightFormGroup}>
                  <Input
                    placeholder="Peso de hoje (ex: 74,5)"
                    suffix="kg"
                    keyboardType="decimal-pad"
                    value={weightInput}
                    onChangeText={setWeightInput}
                    accessibilityLabel="Peso de hoje (kg)"
                  />
                  <Button
                    variant="secondary"
                    onPress={handleLogWeight}
                    isLoading={isLoggingWeight}
                    accessibilityLabel="Registrar peso de hoje"
                  >
                    Registrar peso de hoje
                  </Button>
                </View>

                {weightLogs && weightLogs.logs.length > 0 && (
                  <View style={styles.weightHistoryList}>
                    <AppText size="sm" weight="medium">Últimos registros</AppText>
                    {weightLogs.logs.slice(0, 5).map(entry => (
                      <View key={entry.id} style={styles.weightHistoryItem}>
                        <AppText size="sm" color={theme.colors.gray[700]}>
                          {formatFullDate(entry.date)}
                        </AppText>
                        <AppText size="sm" weight="semiBold">
                          {formatNumber(entry.weight)} kg
                        </AppText>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {weightLogs && (
                <View style={styles.recalcCard}>
                  <View style={styles.recalcHeader}>
                    <AppText weight="semiBold">Recálculo inteligente de metas</AppText>
                    <View
                      style={[
                        styles.recalcBadge,
                        hasGoalDifference ? styles.recalcBadgePending : styles.recalcBadgeSynced,
                      ]}
                      accessibilityLabel={hasGoalDifference ? 'Ajuste sugerido' : 'Metas sincronizadas'}
                    >
                      <AppText
                        size="xs"
                        weight="medium"
                        color={hasGoalDifference ? theme.colors.black[700] : theme.colors.lime[900]}
                      >
                        {hasGoalDifference ? 'Ajuste sugerido' : 'Metas sincronizadas'}
                      </AppText>
                    </View>
                  </View>

                  <AppText size="sm" color={theme.colors.gray[700]}>
                    {hasGoalDifference
                      ? `Com seu peso atual de ${formatNumber(weightLogs.currentWeight)} kg, sugerimos ajustar suas metas diárias:`
                      : `Suas metas diárias já estão alinhadas com seu peso atual (${formatNumber(weightLogs.currentWeight)} kg).`}
                  </AppText>

                  <View style={styles.recalcComparisonRow}>
                    <View style={styles.recalcColumn}>
                      <AppText size="xs" color={theme.colors.gray[700]}>Meta atual</AppText>
                      <AppText size="base" weight="semiBold">
                        {formatNumber(weightLogs.currentGoal.calories)} kcal
                      </AppText>
                      <AppText size="xs" color={theme.colors.gray[700]}>
                        {formatNumber(weightLogs.currentGoal.proteins)}g P • {formatNumber(weightLogs.currentGoal.carbohydrates)}g C • {formatNumber(weightLogs.currentGoal.fats)}g G
                      </AppText>
                    </View>
                    <View style={styles.recalcColumn}>
                      <AppText size="xs" color={theme.colors.gray[700]}>Meta sugerida</AppText>
                      <AppText size="base" weight="semiBold">
                        {formatNumber(weightLogs.suggestedGoal.calories)} kcal
                      </AppText>
                      <AppText size="xs" color={theme.colors.gray[700]}>
                        {formatNumber(weightLogs.suggestedGoal.proteins)}g P • {formatNumber(weightLogs.suggestedGoal.carbohydrates)}g C • {formatNumber(weightLogs.suggestedGoal.fats)}g G
                      </AppText>
                    </View>
                  </View>

                  {hasGoalDifference && (
                    <Button
                      variant="secondary"
                      disabled={isUpdatingGoals}
                      isLoading={isUpdatingGoals}
                      onPress={handleApplySuggestedGoals}
                      accessibilityLabel="Aplicar metas sugeridas"
                    >
                      Aplicar metas sugeridas
                    </Button>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
