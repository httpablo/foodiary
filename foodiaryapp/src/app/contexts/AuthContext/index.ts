import { AuthService } from '@app/services/AuthService';
import { createContext } from 'react';

interface IAuthContextValue {
  signedIn: boolean;
  signedUp: boolean;
  signIn: (payload: AuthService.SignInPayload) => Promise<void>;
  signUp: (payload: AuthService.SignUpPayload) => Promise<void>;
  signOut: () => Promise<boolean>;
}

export const AuthContext = createContext({} as IAuthContextValue);
