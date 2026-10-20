import { useAccount } from '@app/hooks/queries/useAccount';
import { useStreak } from '@app/hooks/queries/useStreak';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { ProfileAvatar } from '@ui/components/ProfileAvatar';
import { theme } from '@ui/styles/theme';
import { FlameIcon, TargetIcon } from 'lucide-react-native';
import { Pressable, TouchableOpacity, View } from 'react-native';
import { styles } from './styles';

function streakLabel(days: number, loggedToday: boolean) {
  if (days === 0) {
    return 'Nenhum dia seguido com registro. Ver resumo semanal';
  }
  const count = `${days} ${days === 1 ? 'dia seguido' : 'dias seguidos'} com registro`;
  return loggedToday
    ? `${count}. Ver resumo semanal`
    : `${count}. Registre uma refeição hoje para manter. Ver resumo semanal`;
}

export function UserHeader() {
  const { account } = useAccount();
  const { streak } = useStreak();
  const { navigate } = useNavigation<AppStackNavigationProps>();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => navigate('Account')}
      >
        <ProfileAvatar photoUrl={account?.profile.photoUrl ?? null} size={48} />

        <View style={styles.greetings}>
          <AppText size="sm" color={theme.colors.gray[700]}>Olá, 👋</AppText>
          <AppText weight="semiBold" numberOfLines={1}>
            {account?.profile.name}
          </AppText>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <Button
          variant="ghost"
          leftIcon={TargetIcon}
          onPress={() => navigate('EditGoals')}
        >
          Metas
        </Button>

        {streak && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={streakLabel(streak.currentStreak, streak.loggedToday)}
            onPress={() => navigate('WeeklySummary')}
            style={styles.streak}
          >
            <FlameIcon
              size={18}
              color={streak.loggedToday ? theme.colors.support.tomato : theme.colors.gray[700]}
              fill={streak.loggedToday ? theme.colors.support.orange : 'transparent'}
            />
            <AppText weight="semiBold">{streak.currentStreak}</AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}
