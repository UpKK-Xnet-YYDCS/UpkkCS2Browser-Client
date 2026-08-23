import { useCallback, useEffect, useState } from 'react';
import { checkAuthStatus, type AuthStatus } from '@/api/auth';
import { clearResponseCache } from '@/api/client';
import { cacheAuth, readCachedAuth } from '@/services/cloudAuthCache';
import { applyCloudAuthRestoreOutcome, restoreCloudAuthSession } from '@/services/cloudAuthFlow';
import {
  clearPersistedCloudApiToken,
  initializeCloudApiToken,
} from '@/services/cloudToken';
import { logDebug, logError } from '@/services/operationLog';

export function useCloudAuthSession() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(readCachedAuth);
  const [isReady, setIsReady] = useState(false);

  const setAuthenticated = useCallback((status: AuthStatus) => {
    setAuthStatus(status);
    cacheAuth(status);
  }, []);

  const invalidate = useCallback(async () => {
    await clearPersistedCloudApiToken().catch((reason) => {
      logError('CloudAuth', `Failed to clear secure token: ${String(reason)}`);
    });
    clearResponseCache();
    setAuthenticated({ logged_in: false });
  }, [setAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const outcome = await restoreCloudAuthSession({
        initializeToken: initializeCloudApiToken,
        checkStatus: checkAuthStatus,
      });
      if (cancelled) return;
      await applyCloudAuthRestoreOutcome(outcome, {
        setAuthenticated,
        invalidate,
        onDeferred: (reason) => logDebug('CloudAuth', `Token verification deferred: ${String(reason)}`),
      });
      if (!cancelled) setIsReady(true);
    })();
    return () => { cancelled = true; };
  }, [invalidate, setAuthenticated]);

  return {
    authStatus,
    isReady,
    setAuthenticated,
    invalidate,
  };
}
