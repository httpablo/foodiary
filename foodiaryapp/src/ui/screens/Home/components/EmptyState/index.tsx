import { View } from 'react-native';

import { useStreak } from '@app/hooks/queries/useStreak';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { CreateMealOptions } from '@ui/components/CreateMealOptions';
import { theme } from '@ui/styles/theme';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { FlameIcon } from 'lucide-react-native';
import { useHomeContext } from '../../context/useHomeContext';
import { styles } from './styles';

export function EmptyState() {
  const { isLoading, date, isError, onRetry } = useHomeContext();
  const { streak } = useStreak();
  const isToday = formatDateToAPI(date) === formatDateToAPI(new Date());
  const streakAtRisk = isToday && !!streak && streak.currentStreak > 0 && !streak.loggedToday;

  if (isError) {
    return (
      <View style={[styles.container, { opacity: isLoading ? 0.5 : 1 }]}>
        <View
          style={styles.errorCard}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <AppText weight="medium" color={theme.colors.support.red}>
            Não foi possível carregar as refeições deste dia.
          </AppText>
          <Button
            variant="secondary"
            onPress={onRetry}
            isLoading={isLoading}
          >
            Tentar novamente
          </Button>
        </View>

        <CreateMealOptions date={date} disabled={isLoading} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { opacity: isLoading ? 0.5 : 1 }]}>
      {streakAtRisk && (
        <View style={styles.streakCard}>
          <FlameIcon size={20} color={theme.colors.support.tomato} />
          <View style={styles.streakText}>
            <AppText weight="semiBold">
              {streak.currentStreak} {streak.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}
            </AppText>
            <AppText size="sm" color={theme.colors.gray[700]}>
              Registre uma refeição hoje para manter sua sequência.
            </AppText>
          </View>
        </View>
      )}

      <AppText color={theme.colors.gray[700]}>
        Cadastre sua primeira refeição através de uma das opções abaixo:
      </AppText>

      <CreateMealOptions date={date} disabled={isLoading} />
    </View>
  );
}
