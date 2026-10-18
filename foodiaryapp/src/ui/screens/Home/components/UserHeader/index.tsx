import { useAccount } from '@app/hooks/queries/useAccount';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { ProfileAvatar } from '@ui/components/ProfileAvatar';
import { theme } from '@ui/styles/theme';
import { TargetIcon } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';
import { styles } from './styles';

export function UserHeader() {
  const { account } = useAccount();
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

      <Button
        variant="ghost"
        leftIcon={TargetIcon}
        onPress={() => navigate('EditGoals')}
      >
        Metas
      </Button>
    </View>
  );
}
