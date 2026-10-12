import { useAccount } from '@app/hooks/queries/useAccount';
import { useWeeklySummary } from '@app/hooks/queries/useWeeklySummary';
import { NutritionTotals } from '@app/types/WeeklySummary';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
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
  const first = Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(start);
  const last = Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(end);
  return `${first} – ${last}`.toUpperCase();
}

function formatDay(date: string): string {
  const local = new Date(`${date}T12:00:00`);
  const weekday = Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(local).replace('.', '');
  return `${weekday.toUpperCase()} ${date.slice(8)}`;
}

export function WeeklySummaryScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const { account } = useAccount();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedMetric, setSelectedMetric] = useState<Metric>('calories');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { summary, isLoading, isRefetching, isError, refetch } = useWeeklySummary(weekStart);
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

  function changeWeek(amount: number) {
    setSelectedDate(null);
    setWeekStart(previous => new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + amount * 7));
  }

  return (
    <View style={[styles.container, { paddingTop: top }]}>
      <AppHeader title="Resumo Semanal" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
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
          </>
        )}
      </ScrollView>
    </View>
  );
}
