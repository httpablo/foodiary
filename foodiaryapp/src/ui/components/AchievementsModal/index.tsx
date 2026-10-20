import { useAuth } from '@app/contexts/AuthContext/useAuth';
import { useAcknowledgeAchievements } from '@app/hooks/mutations/useAcknowledgeAchievements';
import { useAchievements } from '@app/hooks/queries/useAchievements';
import { AppStackNavigationProps } from '@app/navigation/AppStack';
import { AchievementCode } from '@app/types/Achievement';
import { useNavigation } from '@react-navigation/native';
import { theme } from '@ui/styles/theme';
import { AchievementInfo, getAchievementInfo } from '@ui/utils/achievements';
import { TrophyIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { styles } from './styles';

// Celebrates achievements unlocked since the last visit, once.
export function AchievementsModal() {
  const { signedUp } = useAuth();
  const { achievements } = useAchievements();
  const { acknowledgeAchievements } = useAcknowledgeAchievements();
  const { navigate } = useNavigation<AppStackNavigationProps>();
  const [dismissed, setDismissed] = useState<AchievementCode[]>([]);

  const pending = achievements
    .filter(item => item.acknowledgedAt === null && !dismissed.includes(item.code))
    .map(item => getAchievementInfo(item.code))
    .filter((item): item is AchievementInfo => item !== undefined);
  // The welcome modal comes first right after sign-up.
  const visible = !signedUp && pending.length > 0;

  function handleClose(openList = false) {
    const codes = pending.map(item => item.code);
    setDismissed(previous => [...previous, ...codes]);
    void acknowledgeAchievements(codes).catch(() => {});
    if (openList) {
      navigate('Achievements');
    }
  }

  const title = pending.length === 1 ? 'Nova conquista!' : 'Novas conquistas!';

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={() => handleClose()}
    >
      <Pressable style={styles.backdrop} onPress={() => handleClose()} accessibilityLabel="Fechar">
        <Pressable
          style={styles.dialog}
          onPress={(event) => event.stopPropagation()}
          role="dialog"
          accessibilityLabel={title}
          accessibilityViewIsModal
          aria-modal
        >
          <View style={styles.header}>
            <View style={styles.trophy}>
              <TrophyIcon size={28} color={theme.colors.lime[900]} />
            </View>
            <AppText size="xl" weight="semiBold" align="center">{title}</AppText>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {pending.map(({ code, title: itemTitle, doneDescription, icon: Icon }) => (
              <View key={code} style={styles.item}>
                <View style={styles.itemIcon}>
                  <Icon size={20} color={theme.colors.lime[900]} />
                </View>
                <View style={styles.itemText}>
                  <AppText weight="semiBold">{itemTitle}</AppText>
                  <AppText size="sm" color={theme.colors.gray[700]}>{doneDescription}</AppText>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <View style={styles.actionWrapper}>
              <Button variant="secondary" onPress={() => handleClose(true)}>Ver todas</Button>
            </View>
            <View style={styles.actionWrapper}>
              <Button onPress={() => handleClose()}>Continuar</Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
