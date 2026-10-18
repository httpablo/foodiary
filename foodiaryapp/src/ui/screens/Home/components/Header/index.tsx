import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '@ui/components/AppText';
import { theme } from '@ui/styles/theme';
import { ChevronRightIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { formatDateToAPI } from '@ui/utils/formatDateToAPI';
import { useHomeContext } from '../../context/useHomeContext';
import { CurrentGoal } from '../CurrentGoal';
import { DateSwitcher } from '../DateSwitcher';
import { UserHeader } from '../UserHeader';
import { styles } from './styles';

export function Header() {
  const { isLoading, date } = useHomeContext();
  const { navigate } = useNavigation<AppStackNavigationProps>();

  return (
    <View>
      <UserHeader />

      <View style={styles.container}>
        <DateSwitcher />
        <CurrentGoal />
        {formatDateToAPI(date) === formatDateToAPI(new Date()) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Simular próximo prato"
            onPress={() => navigate('MealPlanner')}
            style={styles.plannerLink}
          >
            <View style={styles.plannerLinkText}>
              <AppText weight="semiBold">E se eu comer isso?</AppText>
              <AppText size="sm" color={theme.colors.gray[700]}>Monte um prato e veja como fica seu dia</AppText>
            </View>
            <ChevronRightIcon size={20} color={theme.colors.black[700]} />
          </Pressable>
        )}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver histórico de refeições"
          onPress={() => navigate('MealHistory')}
          style={[styles.weeklyLink, { marginTop: 0, marginBottom: 20 }]}
        >
          <AppText weight="medium" style={{ flex: 1 }} color={theme.colors.lime[900]}>Ver histórico de refeições</AppText>
          <ChevronRightIcon size={20} color={theme.colors.lime[900]} />
        </Pressable>
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
