import 'react-native-reanimated';

import {
  HostGrotesk_400Regular,
  HostGrotesk_500Medium,
  HostGrotesk_600SemiBold,
  useFonts,
} from '@expo-google-fonts/host-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useLayoutEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@app/contexts/AuthContext/AuthProvider';
import { queryClient } from '@app/lib/queryClient';
import { Navigation } from '@app/navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfirmDialogProvider } from '@ui/components/ConfirmDialog';
import { theme } from '@ui/styles/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export function App() {
  const [isFontsLoaded, fontError] = useFonts({
    HostGrotesk_400Regular,
    HostGrotesk_500Medium,
    HostGrotesk_600SemiBold,
  });

  useLayoutEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = 'pt-BR';
    }
  }, []);

  useEffect(() => {
    if (fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError]);

  if (!isFontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ConfirmDialogProvider>
            <AuthProvider>
              <View style={styles.webBackdrop}>
                <View style={styles.appViewport}>
                  <Navigation />
                </View>
              </View>
            </AuthProvider>
          </ConfirmDialogProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  webBackdrop: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? theme.colors.gray[200] : theme.colors.white,
  },
  appViewport: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 600 : undefined,
    alignSelf: 'center',
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
  },
});
