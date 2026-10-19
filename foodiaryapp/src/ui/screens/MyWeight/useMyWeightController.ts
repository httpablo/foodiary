import { useEndWeightGoal } from '@app/hooks/mutations/useEndWeightGoal';
import { useLogWeight } from '@app/hooks/mutations/useLogWeight';
import { useRecalculateGoals } from '@app/hooks/mutations/useRecalculateGoals';
import { useWeightGoal } from '@app/hooks/queries/useWeightGoal';
import { useWeightLogs } from '@app/hooks/queries/useWeightLogs';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { useNavigation } from '@react-navigation/native';
import { useConfirmDialog } from '@ui/components/ConfirmDialog';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { parseDecimal } from '@ui/utils/parseDecimal';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatNumber } from './format';

export interface IWeightFeedback {
  type: 'success' | 'error';
  message: string;
}

export type ChartPeriod = 30 | 90;

const HISTORY_PAGE_SIZE = 10;

function parseBrazilianDate(value: string): Date | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  const [, day, month, year] = match.map(Number);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }
  return parsed;
}

export function formatDateMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function useMyWeightController() {
  const { top, bottom } = useSafeAreaInsets();
  const { navigate } = useNavigation<AppStackNavigationProps>();
  const { confirm } = useConfirmDialog();
  const {
    weightGoalOverview,
    weightGoal,
    isLoading: isLoadingGoal,
    isRefetching: isRefetchingGoal,
    isError: isGoalError,
    refetch: refetchGoal,
  } = useWeightGoal();
  const {
    weightLogs,
    isLoading: isLoadingLogs,
    isRefetching: isRefetchingLogs,
    isError: isLogsError,
    refetch: refetchLogs,
  } = useWeightLogs(90);
  const { logWeight, isLoggingWeight } = useLogWeight();
  const { endWeightGoal, isEndingWeightGoal } = useEndWeightGoal();
  const { recalculateGoals, isRecalculatingGoals } = useRecalculateGoals();

  const [period, setPeriod] = useState<ChartPeriod>(30);
  const [weightInput, setWeightInput] = useState('');
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [historyCount, setHistoryCount] = useState(HISTORY_PAGE_SIZE);
  const [feedback, setFeedback] = useState<IWeightFeedback | null>(null);

  const history = useMemo(
    () => [...(weightLogs?.logs ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [weightLogs],
  );

  const chartPoints = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() - period);
    const from = formatDateToAPI(limit);
    return history.filter(entry => entry.date >= from).map(entry => ({ date: entry.date, weight: entry.weight }));
  }, [history, period]);

  const historyRows = useMemo(() => history.slice(0, historyCount).map((entry, index) => ({
    ...entry,
    delta: history[index + 1] ? entry.weight - history[index + 1].weight : null,
  })), [history, historyCount]);

  const currentWeight = weightLogs?.currentWeight ?? weightGoalOverview?.currentWeight ?? 0;
  const variation = weightLogs?.weightChange ?? 0;
  const variationTowardTarget = !!weightGoal && (
    weightGoal.direction === 'LOSE' ? variation < 0 : variation > 0
  );

  async function refresh() {
    await Promise.all([refetchGoal(), refetchLogs()]);
  }

  async function handleLogWeight() {
    setFeedback(null);
    const parsed = parseDecimal(weightInput);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 700) {
      setFeedback({ type: 'error', message: 'Informe um peso válido entre 1 e 700 kg.' });
      return;
    }

    const today = new Date();
    let date = today;
    if (isCustomDate && dateInput) {
      const parsedDate = parseBrazilianDate(dateInput);
      if (!parsedDate) {
        setFeedback({ type: 'error', message: 'Informe uma data válida no formato DD/MM/AAAA.' });
        return;
      }
      if (formatDateToAPI(parsedDate) > formatDateToAPI(today)) {
        setFeedback({ type: 'error', message: 'Não é possível registrar o peso em uma data futura.' });
        return;
      }
      date = parsedDate;
    }

    try {
      const response = await logWeight({
        weight: Number(parsed.toFixed(2)),
        date: formatDateToAPI(date),
        timezoneOffsetMinutes: today.getTimezoneOffset(),
      });
      setWeightInput('');
      setDateInput('');
      setIsCustomDate(false);
      setFeedback({
        type: 'success',
        message: response.weightGoalAchieved
          ? `Parabéns! Você alcançou sua meta de peso com ${formatNumber(parsed)} kg.`
          : `Peso de ${formatNumber(parsed)} kg registrado com sucesso.`,
      });
    } catch {
      setFeedback({ type: 'error', message: 'Não foi possível registrar seu peso agora.' });
    }
  }

  async function handleRecalculate() {
    setFeedback(null);
    try {
      const { dailyGoal } = await recalculateGoals();
      setFeedback({
        type: 'success',
        message: `Metas diárias atualizadas para ${formatNumber(dailyGoal.calories, 0)} kcal.`,
      });
    } catch {
      setFeedback({ type: 'error', message: 'Não foi possível atualizar suas metas agora.' });
    }
  }

  async function handleBackToAutomatic() {
    const confirmed = await confirm({
      title: 'Calcular metas pelo seu peso?',
      message: 'Suas metas diárias editadas manualmente serão substituídas por metas baseadas no seu peso atual.',
      confirmLabel: 'Atualizar metas',
    });
    if (confirmed) {
      await handleRecalculate();
    }
  }

  async function endGoal(successMessage: string) {
    setFeedback(null);
    try {
      await endWeightGoal();
      setFeedback({ type: 'success', message: successMessage });
    } catch {
      setFeedback({ type: 'error', message: 'Não foi possível atualizar sua meta agora.' });
    }
  }

  async function handleEndGoal() {
    const confirmed = await confirm({
      title: 'Encerrar meta de peso?',
      message: 'Sua meta será encerrada e seu objetivo passará a ser manter o peso. Seu histórico de peso é mantido.',
      confirmLabel: 'Encerrar meta',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    await endGoal('Meta encerrada. Seu objetivo agora é manter o peso.');
  }

  function handleKeepWeight() {
    return endGoal('Tudo certo! Seu objetivo agora é manter o peso.');
  }

  return {
    top,
    bottom,
    navigate,
    overview: weightGoalOverview,
    weightGoal,
    weightLogs,
    isLoading: isLoadingGoal || isLoadingLogs,
    isError: isGoalError || isLogsError,
    isRefreshing: isRefetchingGoal || isRefetchingLogs,
    refresh,
    period,
    setPeriod,
    chartPoints,
    currentWeight,
    variation,
    variationTowardTarget,
    weightInput,
    setWeightInput,
    isCustomDate,
    setIsCustomDate,
    dateInput,
    setDateInput,
    handleLogWeight,
    isLoggingWeight,
    feedback,
    handleRecalculate,
    handleBackToAutomatic,
    isRecalculatingGoals,
    handleKeepWeight,
    handleEndGoal,
    isEndingWeightGoal,
    historyRows,
    hasMoreHistory: history.length > historyCount,
    showMoreHistory: () => setHistoryCount(count => count + HISTORY_PAGE_SIZE),
  };
}
