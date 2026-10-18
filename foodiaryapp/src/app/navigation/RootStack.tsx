import { RouteProp } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@app/contexts/AuthContext/useAuth';
import { AppText } from '@ui/components/AppText';
import { Button } from '@ui/components/Button';
import { theme } from '@ui/styles/theme';
import { AppStack } from './AppStack';
import { AuthStack } from './AuthStack';

type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type RootStackNavigationProps = NativeStackNavigationProp<RootStackParamList>;

export type RootStackScreenProps<
  TRouteName extends keyof RootStackParamList,
> = NativeStackScreenProps<RootStackParamList, TRouteName>;

export type RootStackRouteProps<
  TRouteName extends keyof RootStackParamList,
> = RouteProp<RootStackParamList, TRouteName>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  const { signedIn, connectionError, retryAuth, signOut } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await retryAuth();
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  if (connectionError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View
          style={styles.errorCard}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <AppText size="xl" weight="semiBold" align="center">
            Não foi possível conectar ao servidor
          </AppText>
          <AppText color={theme.colors.gray[700]} align="center" style={styles.errorMessage}>
            Verifique sua conexão com a internet e tente novamente. Sua sessão continua salva neste dispositivo.
          </AppText>

          <View style={styles.errorActions}>
            <Button
              onPress={handleRetry}
              isLoading={isRetrying}
              disabled={isSigningOut}
            >
              Tentar novamente
            </Button>

            <Button
              variant="secondary"
              onPress={handleSignOut}
              isLoading={isSigningOut}
              disabled={isRetrying}
            >
              Sair da conta
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!signedIn && (
        <Stack.Screen
          name="Auth"
          component={AuthStack}
          options={{
            animationTypeForReplace: 'pop',
          }}
        />
      )}

      {signedIn && (
        <Stack.Screen
          name="App"
          component={AppStack}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
    alignItems: 'center',
  },
  errorMessage: {
    lineHeight: 22,
  },
  errorActions: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
});
