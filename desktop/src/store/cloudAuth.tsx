import { useMemo, type ReactNode } from 'react';
import { CloudAuthContext } from '@/contexts/cloudAuthContext';
import { useCloudAuthLogin } from '@/hooks/useCloudAuthLogin';
import { useCloudAuthSession } from '@/hooks/useCloudAuthSession';

export function CloudAuthProvider({ children }: { children: ReactNode }) {
  const { authStatus, isReady, setAuthenticated, invalidate } = useCloudAuthSession();
  const { pendingProvider, error, login, logout } = useCloudAuthLogin({
    invalidate,
    setAuthenticated,
  });

  const value = useMemo(() => ({
    authStatus,
    isLoggedIn: authStatus.logged_in,
    isReady,
    loginPending: pendingProvider !== null,
    pendingProvider,
    error,
    login,
    logout,
    invalidate,
  }), [authStatus, error, invalidate, isReady, login, logout, pendingProvider]);

  return <CloudAuthContext.Provider value={value}>{children}</CloudAuthContext.Provider>;
}
