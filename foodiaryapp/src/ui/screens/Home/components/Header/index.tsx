import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import { ChevronRightIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useHomeContext } from '../../context/useHomeContext';
import { CurrentGoal } from '../CurrentGoal';
import { DateSwitcher } from '../DateSwitcher';
import { UserHeader } from '../UserHeader';
import { styles } from './styles';

export function Header() {
  const { isLoading } = useHomeContext();
  const { navigate } = useNavigation<AppStackNavigationProps>();

  return (
    <View>
      <UserHeader />

      <View style={styles.container}>
        <DateSwitcher />
        <CurrentGoal />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver resumo semanal"
          onPress={() => navigate('WeeklySummary')}
          style={styles.weeklyLink}
        >
          <AppText weight="medium" color={theme.colors.lime[900]}>Ver resumo semanal</AppText>
          <ChevronRightIcon size={20} color={theme.colors.lime[900]} />
        </Pressable>

        <View style={styles.divider} />
        <AppText
          weight="medium"
          style={[styles.mealsLabel, { opacity: isLoading ? 0.5 : 1 }]}
        >
          REFEIÇÕES
        </AppText>
      </View>
    </View>
  );
}
