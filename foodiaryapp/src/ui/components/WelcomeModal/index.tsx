import { Modal, StatusBar, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@app/contexts/AuthContext/useAuth';
import { useAccount } from '@app/hooks/queries/useAccount';
import { Goal } from '@app/types/Goal';
import { theme } from '@ui/styles/theme';
import { useState } from 'react';
import { AppText } from '../AppText';
import { Button } from '../Button';
import { GoalStats } from '../GoalStats';
import { styles } from './styles';

const goalsMap: Record<Goal, { icon: string; label: string }> = {
  LOSE: {
    icon: '🥦',
    label: 'Perder Peso',
  },
  MAINTAIN: {
    icon: '🍍',
    label: 'Manter o Peso',
  },
  GAIN: {
    icon: '🥩',
    label: 'Ganhar Peso',
  },
};

export function WelcomeModal() {
  const { signedUp, acknowledgeWelcome } = useAuth();
  const { account } = useAccount();
  const [visible, setVisible] = useState(signedUp);

  if (!account) {
    return null;
  }

  const goal = goalsMap[account.profile.goal];

  function handleClose() {
    setVisible(false);
    acknowledgeWelcome();
  }

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <StatusBar animated barStyle="light-content" />

      <View style={styles.container}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.wrapper}>
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.icon}>
                  <AppText>{goal.icon}</AppText>
                </View>

                <View style={styles.headerContent}>
                  <AppText
                    color={theme.colors.gray[100]}
                    align="center"
                    size="3xl"
                    weight="semiBold"
                    style={styles.title}
                  >
                    Seu plano de dieta para{' '}
                    <Text style={styles.titleHighlight}>
                      {goal.label}
                    </Text>
                    {' '}está pronto!
                  </AppText>
                  <AppText color={theme.colors.gray[400]} align="center">
                    Essas são suas metas diárias iniciais. Você pode ajustá-las quando quiser.
                  </AppText>
                </View>
              </View>

              <View style={styles.body}>
                <GoalStats
                  variant="dark"
                  calories={{ goal: account.goal.calories }}
                  proteins={{ goal: account.goal.proteins }}
                  carbohydrates={{ goal: account.goal.carbohydrates }}
                  fats={{ goal: account.goal.fats }}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <Button onPress={handleClose}>
                Começar meu plano
              </Button>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </View>
    </Modal>
  );
}
