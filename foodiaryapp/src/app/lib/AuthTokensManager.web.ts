export class AuthTokensManager {
  private static KEY = 'foodiary.web-auth-tokens';

  static async save(tokens: AuthTokensManager.Tokens) {
    window.sessionStorage.setItem(this.KEY, JSON.stringify(tokens));
  }

  static async load(): Promise<AuthTokensManager.Tokens | null> {
    try {
      const value = window.sessionStorage.getItem(this.KEY);
      if (!value) {
        return null;
      }
      const tokens: unknown = JSON.parse(value);
      if (!tokens || typeof tokens !== 'object') {
        return null;
      }
      const { accessToken, refreshToken } = tokens as Record<string, unknown>;
      return typeof accessToken === 'string' && typeof refreshToken === 'string'
        ? { accessToken, refreshToken } : null;
    } catch {
      return null;
    }
  }

  static async clear() {
    window.sessionStorage.removeItem(this.KEY);
  }
}

export namespace AuthTokensManager {
  export type Tokens = {
    accessToken: string;
    refreshToken: string;
  };
}
