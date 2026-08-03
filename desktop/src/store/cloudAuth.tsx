import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import * as api from '@/api';
import { CloudAuthContext } from '@/contexts/cloudAuthContext';
import {
  clearPersistedCloudApiToken,
  initializeCloudApiToken,
  isTauriRuntime,
  persistCloudApiToken,
} from '@/services/cloudToken';
import type { AuthStatus, UserInfo } from '@/api';
import { logDebug, logError, logInfo } from '@/store/log';
import { invokeDesktop, listenDesktopEvent, openExternalUrl } from '@/services/desktopRuntime';
import { reduceCloudLoginAttempt } from '@/services/cloudLoginAttempt';
import type { CloudLoginProvider } from '@/types/cloudAuth';

const CLOUD_USER_CACHE_KEY = 'xproj_cloud_auth_user';
const LOGIN_TIMEOUT_MS = 300_000;

function loadCachedAuth(): AuthStatus {
  try {
    const user = JSON.parse(localStorage.getItem(CLOUD_USER_CACHE_KEY) || 'null') as UserInfo | null;
    return user ? { logged_in: true, user } : { logged_in: false };
  } catch {
    return { logged_in: false };
  }
}

function cacheAuth(status: AuthStatus): void {
  try {
    if (status.logged_in && status.user) {
      localStorage.setItem(CLOUD_USER_CACHE_KEY, JSON.stringify(status.user));
    } else {
      localStorage.removeItem(CLOUD_USER_CACHE_KEY);
      localStorage.removeItem('xproj_auth_status');
    }
  } catch {
    // User metadata caching is optional.
  }
}

function normalizeCallbackUser(value: unknown): UserInfo | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const user = value as Record<string, unknown>;
  const id = Number(user.id);
  if (!Number.isFinite(id)) return undefined;
  const provider = String(user.provider || 'steam') as UserInfo['provider'];
  return {
    id,
    username: String(user.username || user.display_name || 'User'),
    avatar: String(user.avatar_url || user.avatar || '') || undefined,
    provider,
  };
}

function loginUrl(provider: CloudLoginProvider): string {
  switch (provider) {
    case 'google': return api.getGoogleLoginUrl();
    case 'discord': return api.getDiscordLoginUrl();
    case 'upkk': return api.getUpkkLoginUrl();
    case 'steam': return api.getSteamLoginUrl();
  }
}

export function CloudAuthProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(loadCachedAuth);
  const [isReady, setIsReady] = useState(false);
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

  const setAuthenticated = useCallback((status: AuthStatus) => {
    setAuthStatus(status);
    cacheAuth(status);
  }, []);

  const invalidate = useCallback(async () => {
    await clearPersistedCloudApiToken().catch((reason) => {
      logError('CloudAuth', `Failed to clear secure token: ${String(reason)}`);
    });
    api.clearResponseCache();
    setAuthenticated({ logged_in: false });
  }, [setAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await initializeCloudApiToken();
      if (cancelled) return;
      if (!result.token) {
        setAuthenticated({ logged_in: false });
        setIsReady(true);
        return;
      }

      try {
        const status = await api.checkAuthStatus();
        if (cancelled) return;
        if (status.logged_in) setAuthenticated(status);
        else await invalidate();
      } catch (reason) {
        logDebug('CloudAuth', `Token verification deferred: ${String(reason)}`);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [invalidate, setAuthenticated]);

  useEffect(() => {
    if (!isTauriRuntime()) return undefined;
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    void Promise.allSettled([
      listenDesktopEvent<string>('login-token-ready', async (payload) => {
        if (disposed) return;
        try {
          const data = JSON.parse(payload) as { token?: string; user?: unknown; error?: string };
          if (data.error || !data.token) throw new Error(data.error || 'OAuth callback did not include a token');
          loginCompletedRef.current = true;
          await persistCloudApiToken(data.token);
          const callbackUser = normalizeCallbackUser(data.user);
          setAuthenticated({ logged_in: true, user: callbackUser });
          try {
            const status = await api.checkAuthStatus();
            if (status.logged_in) setAuthenticated(status);
            else await invalidate();
          } catch (reason) {
            logDebug('CloudAuth', `Post-login verification deferred: ${String(reason)}`);
          }
          finishLoginAttempt();
          setError(null);
          api.clearResponseCache();
          logInfo('CloudAuth', 'Cloud account login completed');
        } catch (reason) {
          finishLoginAttempt();
          setError(reason instanceof Error ? reason.message : String(reason));
          logError('CloudAuth', `OAuth callback failed: ${String(reason)}`);
        }
      }),
      listenDesktopEvent('login-window-closed', () => {
        if (disposed || loginCompletedRef.current) return;
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
    const url = loginUrl(provider);
    setError(null);
    loginCompletedRef.current = false;
    if (!isTauriRuntime()) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setError('Browser preview does not persist OAuth login. Use the Tauri app to complete sign-in.');
      return;
    }

    dispatchLoginAttempt({ type: 'started', provider });
    try {
      await invokeDesktop('open_steam_login', { loginUrl: url });
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        if (!loginCompletedRef.current) finishLoginAttempt();
      }, LOGIN_TIMEOUT_MS);
    } catch (reason) {
      finishLoginAttempt();
      setError(reason instanceof Error ? reason.message : String(reason));
      await openExternalUrl(url);
    }
  }, [finishLoginAttempt]);

  const logout = useCallback(async () => {
    await api.logout();
    await invalidate();
    finishLoginAttempt();
    setError(null);
  }, [finishLoginAttempt, invalidate]);

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
