import { useAuth } from '@app/contexts/AuthContext/useAuth';
import { useUpdateReminderSettings } from '@app/hooks/mutations/useUpdateReminderSettings';
import { useAccount } from '@app/hooks/queries/useAccount';
import { useReminderSettings } from '@app/hooks/queries/useReminderSettings';
import { StreakReminder } from '@app/lib/StreakReminder';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '@ui/components/AppHeader';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { useConfirmDialog } from '@ui/components/ConfirmDialog';
import { ProfileAvatar } from '@ui/components/ProfileAvatar';
import { theme } from '@ui/styles/theme';
import { BellIcon, LogOutIcon, TrophyIcon, UserRoundIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
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
  const { reminderSettings } = useReminderSettings();
  const { updateReminderSettings } = useUpdateReminderSettings();

  async function handleToggleReminder(enabled: boolean) {
    if (!reminderSettings) {
      return;
    }
    if (enabled && !(await StreakReminder.requestPermission())) {
      void alert({
        title: 'Notificações desativadas',
        message: 'Permita notificações do Foodiary nas configurações do aparelho para receber o lembrete.',
      });
      return;
    }
    await updateReminderSettings({ ...reminderSettings, enabled });
  }

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

        <View style={styles.actions}>
          <Button variant="secondary" onPress={() => navigate('EditProfile')}>
            <View style={styles.actionLabel}>
              <UserRoundIcon size={20} color={theme.colors.black[700]} />
              <AppText weight="medium">Editar perfil</AppText>
            </View>
          </Button>

          <Button variant="secondary" onPress={() => navigate('Achievements')}>
            <View style={styles.actionLabel}>
              <TrophyIcon size={20} color={theme.colors.black[700]} />
              <AppText weight="medium">Conquistas</AppText>
            </View>
          </Button>
        </View>

        {StreakReminder.isSupported && reminderSettings && (
          <View style={styles.reminderCard}>
            <View style={styles.reminderRow}>
              <BellIcon size={20} color={theme.colors.black[700]} />
              <View style={styles.reminderText}>
                <AppText weight="semiBold">Lembrete diário</AppText>
                <AppText size="sm" color={theme.colors.gray[700]}>
                  Avisa no horário escolhido quando o dia ainda não tem refeições registradas.
                </AppText>
              </View>
              <Switch
                accessibilityLabel="Lembrete diário"
                value={reminderSettings.enabled}
                onValueChange={(value) => {
                  void handleToggleReminder(value);
                }}
                trackColor={{ false: theme.colors.gray[400], true: theme.colors.lime[700] }}
                thumbColor={theme.colors.white}
                ios_backgroundColor={theme.colors.gray[400]}
                // react-native-web ignores thumbColor while on and falls back to its own teal.
                {...{ activeThumbColor: theme.colors.white }}
              />
            </View>

            {reminderSettings.enabled && (
              <View style={styles.hours} accessibilityRole="radiogroup" accessibilityLabel="Horário do lembrete">
                {StreakReminder.hours.map(hour => (
                  <Pressable
                    key={hour}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: reminderSettings.hour === hour }}
                    onPress={() => {
                      void updateReminderSettings({ ...reminderSettings, hour });
                    }}
                    style={[styles.hour, reminderSettings.hour === hour && styles.hourSelected]}
                  >
                    <AppText
                      size="sm"
                      weight="medium"
                      align="center"
                      color={reminderSettings.hour === hour ? theme.colors.black[700] : theme.colors.gray[700]}
                    >
                      {hour}h
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
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
