import { useAuth } from '@app/contexts/AuthContext/useAuth';
import { useAccount } from '@app/hooks/queries/useAccount';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { useConfirmDialog } from '@ui/components/ConfirmDialog';
import { ProfileAvatar } from '@ui/components/ProfileAvatar';
import { theme } from '@ui/styles/theme';
import { LogOutIcon, UserRoundIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';

export function Account() {
  const { account } = useAccount();
  const { signOut } = useAuth();
  const { navigate } = useNavigation<AppStackNavigationProps>();
  const { top, bottom } = useSafeAreaInsets();
  const { confirm, alert } = useConfirmDialog();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSignOut() {
    setErrorMessage(null);
    void confirm({
      title: 'Sair da conta?',
      message: 'Você precisará entrar novamente para acessar seus dados.',
      cancelLabel: 'Cancelar',
      confirmLabel: 'Sair',
      destructive: true,
      onConfirm: async () => {
        setIsSigningOut(true);
        try {
          const revoked = await signOut();
          if (!revoked) {
            void alert({
              title: 'Sessão local encerrada',
              message: 'Não foi possível encerrar a sessão no servidor.',
            });
          }
        } catch {
          const message = 'Não foi possível sair da conta. Tente novamente.';
          setErrorMessage(message);
          void alert({
            title: 'Erro',
            message,
          });
        } finally {
          setIsSigningOut(false);
        }
      },
    });
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
        {errorMessage && (
          <View
            style={styles.feedbackBanner}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <AppText size="sm" color={theme.colors.support.red}>
              {errorMessage}
            </AppText>
          </View>
        )}

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
