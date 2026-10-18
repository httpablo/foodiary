import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { useAccount } from '@app/hooks/queries/useAccount';
import { AuthTokensManager } from '@app/lib/AuthTokensManager';
import { queryKeys } from '@app/lib/queryKeys';
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

function isDefinitiveAuthError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 400;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  const createRef = typeof useRef === 'function'
    ? useRef
    : <T,>(initial: T) => ({ current: initial });
  const sessionGenerationRef = createRef(0);
  const refreshedTokenRef = createRef<string | null>(null);

  const { account, loadAccount } = useAccount({ enabled: false });
  const queryClient = useQueryClient();
  const forceRender = useForceRender();

  const acknowledgeWelcome = useCallback(() => {
    setSignedUp(false);
  }, []);

  const clearSession = useCallback(async () => {
    sessionGenerationRef.current += 1;
    refreshedTokenRef.current = null;
    Service.removeAccessToken();
    Service.removeRefreshTokenHandler();
    setSignedUp(false);
    setConnectionError(false);

    queryClient.setQueryData(queryKeys.account(), null);
    queryClient.clear();
    forceRender();
    await AuthTokensManager.clear();
  }, [queryClient, forceRender]);

  const signOut = useCallback(async () => {
    sessionGenerationRef.current += 1;
    const rotatedRefreshToken = refreshedTokenRef.current;
    refreshedTokenRef.current = null;
    Service.removeAccessToken();
    Service.removeRefreshTokenHandler();

    const tokens = await AuthTokensManager.load();
    const refreshToken = rotatedRefreshToken ?? tokens?.refreshToken;
    let revocationFailed = false;
    if (refreshToken) {
      try {
        await AuthService.signOut(refreshToken);
      } catch {
        revocationFailed = true;
      }
    }

    await clearSession();
    return !revocationFailed;
  }, [clearSession]);

  const setupAuth = useCallback(async (tokens: ISetupAuthParams, generation = sessionGenerationRef.current) => {
    if (sessionGenerationRef.current !== generation) {
      return;
    }

    Service.setAccessToken(tokens.accessToken);
    Service.setRefreshTokenHandler(async () => {
      if (sessionGenerationRef.current !== generation) {
        throw new Error('Session invalidated');
      }

      let storedTokens: AuthTokensManager.Tokens | null = null;
      try {
        storedTokens = await AuthTokensManager.load();
        if (sessionGenerationRef.current !== generation) {
          throw new Error('Session invalidated');
        }
        if (!storedTokens) {
          throw new Error('Tokens not found');
        }

        const newTokens = await AuthService.refresh({
          refreshToken: refreshedTokenRef.current ?? storedTokens.refreshToken,
        });
        refreshedTokenRef.current = newTokens.refreshToken;

        if (sessionGenerationRef.current !== generation) {
          throw new Error('Session invalidated');
        }

        Service.setAccessToken(newTokens.accessToken);
        await AuthTokensManager.save(newTokens);

        if (sessionGenerationRef.current !== generation) {
          Service.removeAccessToken();
          Service.removeRefreshTokenHandler();
          await AuthTokensManager.clear();
          throw new Error('Session invalidated');
        }
      } catch (error) {
        if (sessionGenerationRef.current !== generation) {
          throw error;
        }
        if (!storedTokens || isDefinitiveAuthError(error)) {
          await clearSession();
        }
        throw error;
      }
    });

    const result = await loadAccount();
    if (sessionGenerationRef.current !== generation) {
      return;
    }
    if (result.error) {
      throw result.error;
    }
  }, [loadAccount, clearSession]);

  const retryAuth = useCallback(async () => {
    const generation = sessionGenerationRef.current;
    setConnectionError(false);

    try {
      const tokens = await AuthTokensManager.load();
      if (sessionGenerationRef.current !== generation) {
        return;
      }
      if (tokens) {
        await setupAuth(tokens, generation);
      }
    } catch (error) {
      if (sessionGenerationRef.current !== generation) {
        return;
      }
      if (isDefinitiveAuthError(error)) {
        await clearSession();
      } else {
        setConnectionError(true);
      }
    }
  }, [setupAuth, clearSession]);

  useLayoutEffect(() => {
    async function load() {
      try {
        await retryAuth();
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    void load();
  }, [retryAuth]);

  const signIn = useCallback(async (payload: AuthService.SignInPayload) => {
    const generation = ++sessionGenerationRef.current;
    refreshedTokenRef.current = null;
    setConnectionError(false);

    const tokens = await AuthService.signIn(payload);
    if (sessionGenerationRef.current !== generation) {
      return;
    }

    try {
      await AuthTokensManager.save(tokens);
      await setupAuth(tokens, generation);
    } catch (error) {
      if (sessionGenerationRef.current === generation) {
        await clearSession();
      }
      throw error;
    }
  }, [setupAuth, clearSession]);

  const signUp = useCallback(async (payload: AuthService.SignUpPayload) => {
    const generation = ++sessionGenerationRef.current;
    refreshedTokenRef.current = null;
    setConnectionError(false);

    const tokens = await AuthService.signUp(payload);
    if (sessionGenerationRef.current !== generation) {
      return;
    }

    try {
      await AuthTokensManager.save(tokens);
      setSignedUp(true);
      await setupAuth(tokens, generation);
    } catch (error) {
      if (sessionGenerationRef.current === generation) {
        await clearSession();
      }
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
        connectionError,
        signIn,
        signUp,
        signOut,
        retryAuth,
        acknowledgeWelcome,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
