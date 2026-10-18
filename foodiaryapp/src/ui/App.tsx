import 'react-native-reanimated';

import {
  HostGrotesk_400Regular,
  HostGrotesk_500Medium,
  HostGrotesk_600SemiBold,
  useFonts,
} from '@expo-google-fonts/host-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider } from '@app/contexts/AuthContext/AuthProvider';
import { queryClient } from '@app/lib/queryClient';
import { Navigation } from '@app/navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfirmDialogProvider } from '@ui/components/ConfirmDialog';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export function App() {
  const [isFontsLoaded, fontError] = useFonts({
    HostGrotesk_400Regular,
    HostGrotesk_500Medium,
    HostGrotesk_600SemiBold,
  });

  useEffect(() => {
    if (fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError]);

  if (!isFontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ConfirmDialogProvider>
            <AuthProvider>
              <Navigation />
            </AuthProvider>
          </ConfirmDialogProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
