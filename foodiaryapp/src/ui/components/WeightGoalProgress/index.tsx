import { WeightGoal } from '@app/types/WeightGoal';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import { View } from 'react-native';
import { styles } from './styles';

interface IWeightGoalProgressBarProps {
  weightGoal: WeightGoal;
  currentWeight: number;
  compact?: boolean;
}

const formatKg = (value: number) => `${Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} kg`;

export function WeightGoalProgressBar({ weightGoal, currentWeight, compact = false }: IWeightGoalProgressBarProps) {
  const percent = Math.min(100, Math.max(0, weightGoal.progress.percent));
  const percentLabel = `${Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(percent)}%`;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Meta de peso: de ${formatKg(weightGoal.startWeight)} para ${formatKg(weightGoal.targetWeight)}, peso atual ${formatKg(currentWeight)}, ${percentLabel} concluído`}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View style={styles.valuesRow}>
        <View style={styles.valueBox}>
          {!compact && <AppText size="xs" color={theme.colors.gray[700]}>Início</AppText>}
          <AppText size={compact ? 'sm' : 'base'} weight="semiBold">{formatKg(weightGoal.startWeight)}</AppText>
        </View>
        <View style={[styles.valueBox, styles.valueBoxCenter]}>
          {!compact && <AppText size="xs" color={theme.colors.gray[700]}>Atual</AppText>}
          <AppText size={compact ? 'sm' : 'base'} weight="semiBold">{formatKg(currentWeight)}</AppText>
        </View>
        <View style={[styles.valueBox, styles.valueBoxEnd]}>
          {!compact && <AppText size="xs" color={theme.colors.gray[700]}>Meta</AppText>}
          <AppText size={compact ? 'sm' : 'base'} weight="semiBold">{formatKg(weightGoal.targetWeight)}</AppText>
        </View>
      </View>

      <View style={[styles.track, compact && styles.trackCompact]}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>

      <AppText size="xs" weight="medium" color={theme.colors.lime[900]}>{percentLabel} do caminho</AppText>
    </View>
  );
}
