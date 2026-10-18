import { View } from 'react-native';

import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { CreateMealOptions } from '@ui/components/CreateMealOptions';
import { theme } from '@ui/styles/theme';
import { useHomeContext } from '../../context/useHomeContext';
import { styles } from './styles';

export function EmptyState() {
  const { isLoading, date, isError, onRetry } = useHomeContext();

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
      <AppText color={theme.colors.gray[700]}>
        Cadastre sua primeira refeição através de uma das opções abaixo:
      </AppText>

      <CreateMealOptions date={date} disabled={isLoading} />
    </View>
  );
}
