import { useAuth } from '@app/contexts/AuthContext/useAuth';
import { useAccount } from '@app/hooks/queries/useAccount';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { ProfileAvatar } from '@ui/components/ProfileAvatar';
import { theme } from '@ui/styles/theme';
import { LogOutIcon, UserRoundIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';

export function Account() {
  const { account } = useAccount();
  const { signOut } = useAuth();
  const { navigate } = useNavigation<AppStackNavigationProps>();
  const { top, bottom } = useSafeAreaInsets();
  const [isSigningOut, setIsSigningOut] = useState(false);

  function handleSignOut() {
    Alert.alert('Sair da conta?', 'Você precisará entrar novamente para acessar seus dados.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          setIsSigningOut(true);
          void signOut()
            .then((revoked) => {
              if (!revoked) {
                Alert.alert('Sessão local encerrada', 'Não foi possível encerrar a sessão no servidor.');
              }
            })
            .catch(() => Alert.alert('Erro', 'Não foi possível sair da conta. Tente novamente.'))
            .finally(() => setIsSigningOut(false));
        },
      },
    ]);
  }

  if (!account) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: top, paddingBottom: bottom + 20 }]}>
      <AppHeader title="Conta" />

      <View style={styles.content}>
        <View style={styles.profile}>
          <ProfileAvatar photoUrl={account.profile.photoUrl} size={80} />
          <AppText size="xl" weight="semiBold">{account.profile.name}</AppText>
        </View>

        <Button variant="secondary" onPress={() => navigate('EditProfile')}>
          <View style={styles.actionLabel}>
            <UserRoundIcon size={20} color={theme.colors.black[700]} />
            <AppText weight="medium">Editar perfil</AppText>
          </View>
        </Button>
      </View>

      <View style={styles.footer}>
        <Button variant="secondary" onPress={handleSignOut} isLoading={isSigningOut}>
          <View style={styles.actionLabel}>
            <LogOutIcon size={20} color={theme.colors.support.red} />
            <AppText color={theme.colors.support.red} weight="medium">Sair da conta</AppText>
          </View>
        </Button>
      </View>
    </View>
  );
}
