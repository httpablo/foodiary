import { AuthService } from '@app/services/AuthService';
import { createContext } from 'react';

interface IAuthContextValue {
  signedIn: boolean;
  signedUp: boolean;
  connectionError: boolean;
  signIn: (payload: AuthService.SignInPayload) => Promise<void>;
  signUp: (payload: AuthService.SignUpPayload) => Promise<void>;
  signOut: () => Promise<boolean>;
  retryAuth: () => Promise<void>;
  acknowledgeWelcome: () => void;
}

export const AuthContext = createContext<IAuthContextValue>({
  signedIn: false,
  signedUp: false,
  connectionError: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => false,
  retryAuth: async () => {},
  acknowledgeWelcome: () => {},
});
