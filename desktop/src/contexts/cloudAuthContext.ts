import { createContext } from 'react';
import type { AuthStatus } from '@/api/auth';
import type { CloudLoginProvider } from '@/types/cloudAuth';

export type { CloudLoginProvider } from '@/types/cloudAuth';

export interface CloudAuthContextValue {
  authStatus: AuthStatus;
  isLoggedIn: boolean;
  isReady: boolean;
  loginPending: boolean;
  pendingProvider: CloudLoginProvider | null;
  error: string | null;
  login(provider: CloudLoginProvider): Promise<void>;
  logout(): Promise<void>;
  invalidate(): Promise<void>;
}

export const CloudAuthContext = createContext<CloudAuthContextValue | null>(null);
