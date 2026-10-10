import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export class AuthTokensManager {
  private static KEY = 'foodiary.auth-tokens';

  private static LEGACY_KEY = '@foodiary:auth-tokens';

  static async save(tokens: AuthTokensManager.Tokens) {
    await SecureStore.setItemAsync(this.KEY, JSON.stringify(tokens));
    await AsyncStorage.removeItem(this.LEGACY_KEY);
  }

  static async load(): Promise<AuthTokensManager.Tokens | null> {
    try {
      const stored = await SecureStore.getItemAsync(this.KEY);
      if (stored) {
        return this.parse(stored);
      }

      const legacy = await AsyncStorage.getItem(this.LEGACY_KEY);
      if (!legacy) {
        return null;
      }

      const tokens = this.parse(legacy);
      if (!tokens) {
        return null;
      }
      await this.save(tokens);
      return tokens;
    } catch {
      return null;
    }
  }

  static async clear() {
    const results = await Promise.allSettled([
      SecureStore.deleteItemAsync(this.KEY),
      AsyncStorage.removeItem(this.LEGACY_KEY),
    ]);
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') {
      throw failed.reason;
    }
  }

  private static parse(value: string): AuthTokensManager.Tokens | null {
    const tokens: unknown = JSON.parse(value);
    if (!tokens || typeof tokens !== 'object') {
      return null;
    }
    const { accessToken, refreshToken } = tokens as Record<string, unknown>;
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      return null;
    }
    return { accessToken, refreshToken };
  }
}

export namespace AuthTokensManager {
  export type Tokens = {
    accessToken: string;
    refreshToken: string;
  }
}
