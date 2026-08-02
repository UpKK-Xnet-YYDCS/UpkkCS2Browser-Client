import { createContext } from 'react';
import type { AuthStatus } from '@/api';

export type CloudLoginProvider = 'steam' | 'google' | 'discord' | 'upkk';

export interface CloudAuthContextValue {
  authStatus: AuthStatus;
  isLoggedIn: boolean;
  isReady: boolean;
  loginPending: boolean;
  error: string | null;
  login(provider: CloudLoginProvider): Promise<void>;
  logout(): Promise<void>;
  invalidate(): Promise<void>;
}

export const CloudAuthContext = createContext<CloudAuthContextValue | null>(null);
