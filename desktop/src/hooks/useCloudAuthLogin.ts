import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  checkAuthStatus,
  getDiscordLoginUrl,
  getGoogleLoginUrl,
  getSteamLoginUrl,
  getUpkkLoginUrl,
  logout as apiLogout,
  type AuthStatus,
} from '@/api/auth';
import { clearResponseCache } from '@/api/client';
import { parseLoginCallbackPayload } from '@/services/cloudAuthCache';
import {
  completeCloudLogin,
  planCloudLoginStart,
  shouldFinishLoginOnWindowClose,
  type CloudLoginUrlSources,
} from '@/services/cloudAuthFlow';
import { reduceCloudLoginAttempt } from '@/services/cloudLoginAttempt';
import { isTauriRuntime, persistCloudApiToken } from '@/services/cloudToken';
import { invokeDesktop, listenDesktopEvent, openExternalUrl } from '@/services/desktopRuntime';
import { logDebug, logError, logInfo } from '@/services/operationLog';
import type { CloudLoginProvider } from '@/types/cloudAuth';

const CLOUD_LOGIN_URLS: CloudLoginUrlSources = {
  google: getGoogleLoginUrl,
  discord: getDiscordLoginUrl,
  upkk: getUpkkLoginUrl,
  steam: getSteamLoginUrl,
};

interface UseCloudAuthLoginOptions {
  invalidate: () => Promise<void>;
  setAuthenticated: (status: AuthStatus) => void;
}

export function useCloudAuthLogin({
  invalidate,
  setAuthenticated,
}: UseCloudAuthLoginOptions) {
  const [pendingProvider, dispatchLoginAttempt] = useReducer(reduceCloudLoginAttempt, null);
  const [error, setError] = useState<string | null>(null);
  const loginCompletedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const finishLoginAttempt = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    dispatchLoginAttempt({ type: 'finished' });
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return undefined;
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    void Promise.allSettled([
      listenDesktopEvent('login-token-ready', async (payload) => {
        if (disposed) return;
        try {
          const data = parseLoginCallbackPayload(payload);
          loginCompletedRef.current = true;
          await completeCloudLogin(data.token, data.user, {
            persistToken: persistCloudApiToken,
            checkStatus: checkAuthStatus,
            invalidate,
            setAuthenticated,
            finishLoginAttempt,
            setError,
            clearResponseCache,
            onDeferredVerification: (reason) => logDebug('CloudAuth', `Post-login verification deferred: ${String(reason)}`),
            onCompleted: () => logInfo('CloudAuth', 'Cloud account login completed'),
          });
        } catch (reason) {
          finishLoginAttempt();
          setError(reason instanceof Error ? reason.message : String(reason));
          logError('CloudAuth', `OAuth callback failed: ${String(reason)}`);
        }
      }),
      listenDesktopEvent('login-window-closed', () => {
        if (!shouldFinishLoginOnWindowClose(disposed, loginCompletedRef.current)) return;
        finishLoginAttempt();
        logDebug('CloudAuth', 'Cloud account login window closed before completion');
      }),
    ]).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          logDebug('CloudAuth', `OAuth event listener unavailable: ${String(result.reason)}`);
        } else if (disposed) {
          result.value();
        } else {
          unlisteners.push(result.value);
        }
      }
    });

    return () => {
      disposed = true;
      unlisteners.forEach(unlisten => unlisten());
    };
  }, [finishLoginAttempt, invalidate, setAuthenticated]);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const login = useCallback(async (provider: CloudLoginProvider) => {
    const plan = planCloudLoginStart(isTauriRuntime(), provider, CLOUD_LOGIN_URLS);
    setError(null);
    loginCompletedRef.current = false;
    if (plan.type === 'browser-preview') {
      window.open(plan.url, '_blank', 'noopener,noreferrer');
      setError(plan.error);
      return;
    }

    dispatchLoginAttempt({ type: 'started', provider });
    try {
      await invokeDesktop('open_steam_login', { loginUrl: plan.url });
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        if (!loginCompletedRef.current) finishLoginAttempt();
      }, plan.timeoutMs);
    } catch (reason) {
      finishLoginAttempt();
      setError(reason instanceof Error ? reason.message : String(reason));
      await openExternalUrl(plan.url);
    }
  }, [finishLoginAttempt]);

  const logout = useCallback(async () => {
    await apiLogout();
    await invalidate();
    finishLoginAttempt();
    setError(null);
  }, [finishLoginAttempt, invalidate]);

  return {
    pendingProvider,
    error,
    login,
    logout,
    finishLoginAttempt,
  };
}
