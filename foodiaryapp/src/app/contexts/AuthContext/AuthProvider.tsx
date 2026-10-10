import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useLayoutEffect, useState } from 'react';

import { useAccount } from '@app/hooks/queries/useAccount';
import { AuthTokensManager } from '@app/lib/AuthTokensManager';
import { AuthService } from '@app/services/AuthService';
import { Service } from '@app/services/Service';

import { useForceRender } from '@app/hooks/app/useForceRender';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '.';

void SplashScreen.preventAutoHideAsync();

interface ISetupAuthParams {
  accessToken: string;
  refreshToken: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  const { account, loadAccount } = useAccount({ enabled: false });
  const queryClient = useQueryClient();
  const forceRender = useForceRender();

  const clearSession = useCallback(async () => {
    await AuthTokensManager.clear();
    Service.removeAccessToken();
    Service.removeRefreshTokenHandler();
    setSignedUp(false);

    queryClient.setQueryData(['account'], null);
    queryClient.clear();
    forceRender();
  }, [queryClient, forceRender]);

  const signOut = useCallback(async () => {
    const tokens = await AuthTokensManager.load();
    let revocationFailed = false;
    if (tokens) {
      try {
        await AuthService.signOut(tokens.refreshToken);
      } catch {
        revocationFailed = true;
      }
    }

    await clearSession();
    return !revocationFailed;
  }, [clearSession]);

  const setupAuth = useCallback(async (tokens: ISetupAuthParams) => {
    Service.setAccessToken(tokens.accessToken);
    Service.setRefreshTokenHandler(async () => {
      try {
        const storedTokens = await AuthTokensManager.load();
        if (!storedTokens) {
          throw new Error('Tokens not found');
        }

        const newTokens = await AuthService.refresh({
          refreshToken: storedTokens.refreshToken,
        });

        Service.setAccessToken(newTokens.accessToken);
        await AuthTokensManager.save(newTokens);
      } catch (error) {
        await clearSession();
        throw error;
      }
    });

    const result = await loadAccount();
    if (result.error) {
      throw result.error;
    }
  }, [loadAccount, clearSession]);

  useLayoutEffect(() => {
    async function load() {
      try {
        const tokens = await AuthTokensManager.load();
        if (tokens) {
          await setupAuth(tokens);
        }
      } catch {
        await clearSession();
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    void load();
  }, [setupAuth, clearSession]);

  const signIn = useCallback(async (payload: AuthService.SignInPayload) => {
    const tokens = await AuthService.signIn(payload);
    await AuthTokensManager.save(tokens);
    try {
      await setupAuth(tokens);
    } catch (error) {
      await clearSession();
      throw error;
    }
  }, [setupAuth, clearSession]);

  const signUp = useCallback(async (payload: AuthService.SignUpPayload) => {
    const tokens = await AuthService.signUp(payload);

    setSignedUp(true);
    await AuthTokensManager.save(tokens);
    try {
      await setupAuth(tokens);
    } catch (error) {
      await clearSession();
      throw error;
    }
  }, [setupAuth, clearSession]);

  if (!isReady) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        signedIn: !!account,
        signedUp,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
