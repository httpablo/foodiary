import { useWeightGoal } from '@app/hooks/queries/useWeightGoal';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { styles } from './styles';

const formatKg = (value: number) => `${Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} kg`;

export function WeightGoalCard() {
  const { navigate } = useNavigation<AppStackNavigationProps>();
  const { weightGoalOverview, weightGoal, isLoading } = useWeightGoal();

  if (isLoading) {
    return <View style={[styles.card, { opacity: 0.5 }]} accessibilityLabel="Carregando meta de peso" />;
  }

  if (!weightGoalOverview) {
    return null;
  }

  if (!weightGoal) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Definir meta de peso"
        onPress={() => navigate('WeightGoalSetup')}
        style={[styles.card, styles.row]}
      >
        <View style={styles.text}>
          <AppText weight="semiBold">Defina uma meta de peso</AppText>
          <AppText size="sm" color={theme.colors.gray[700]}>Acompanhe sua evolução até o peso desejado</AppText>
        </View>
        <ChevronRightIcon size={20} color={theme.colors.black[700]} />
      </Pressable>
    );
  }

  if (weightGoal.status === 'ACHIEVED') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Meta de ${formatKg(weightGoal.targetWeight)} alcançada. Abrir meu peso`}
        onPress={() => navigate('MyWeight')}
        style={[styles.card, styles.row]}
      >
        <View style={styles.text}>
          <AppText weight="semiBold">Meta alcançada! 🎉</AppText>
          <AppText size="sm" color={theme.colors.gray[700]}>Você chegou aos {formatKg(weightGoal.targetWeight)}. Veja o que vem agora</AppText>
        </View>
        <ChevronRightIcon size={20} color={theme.colors.black[700]} />
      </Pressable>
    );
  }

  const { remainingKg, percent } = weightGoal.progress;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const roundedPercent = Math.round(clampedPercent);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Meta de peso: ${formatKg(weightGoalOverview.currentWeight)} de ${formatKg(weightGoal.targetWeight)}, faltam ${formatKg(remainingKg)}, ${roundedPercent}% concluído. Abrir meu peso`}
      onPress={() => navigate('MyWeight')}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={styles.text}>
          <AppText size="xs" weight="medium" color={theme.colors.gray[700]} style={styles.label}>META DE PESO</AppText>
          <View style={styles.values}>
            <AppText size="lg" weight="semiBold">{formatKg(weightGoalOverview.currentWeight)}</AppText>
            <ArrowRightIcon size={16} color={theme.colors.gray[700]} />
            <AppText size="lg" weight="semiBold" color={theme.colors.gray[700]}>{formatKg(weightGoal.targetWeight)}</AppText>
          </View>
        </View>
        <ChevronRightIcon size={20} color={theme.colors.black[700]} />
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clampedPercent}%` }]} />
      </View>
      <View style={styles.row}>
        <AppText size="sm" color={theme.colors.gray[700]}>Faltam {formatKg(remainingKg)}</AppText>
        <AppText size="sm" weight="medium">{roundedPercent}%</AppText>
      </View>
    </Pressable>
  );
}
