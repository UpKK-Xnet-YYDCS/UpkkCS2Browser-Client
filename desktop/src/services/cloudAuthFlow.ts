import type { AuthStatus } from '@/api/auth';
import type { CloudLoginProvider } from '@/types/cloudAuth';
import { normalizeCallbackUser } from './cloudAuthCache.ts';

export const CLOUD_LOGIN_TIMEOUT_MS = 300_000;
export const BROWSER_PREVIEW_LOGIN_ERROR =
  'Browser preview does not persist OAuth login. Use the Tauri app to complete sign-in.';

export interface CloudLoginUrlSources {
  google: () => string;
  discord: () => string;
  upkk: () => string;
  steam: () => string;
}

export type CloudLoginStartPlan =
  | { type: 'browser-preview'; url: string; error: string }
  | { type: 'tauri'; url: string; timeoutMs: number };

export type CloudAuthRestoreResult =
  | { type: 'logged-out' }
  | { type: 'authenticated'; status: AuthStatus }
  | { type: 'invalid' }
  | { type: 'deferred'; reason: unknown };

export interface CompleteCloudLoginDeps {
  persistToken: (token: string) => Promise<void>;
  checkStatus: () => Promise<AuthStatus>;
  invalidate: () => Promise<void>;
  setAuthenticated: (status: AuthStatus) => void;
  finishLoginAttempt: () => void;
  setError: (error: string | null) => void;
  clearResponseCache: () => void;
  onDeferredVerification: (reason: unknown) => void;
  onCompleted: () => void;
}

export function cloudLoginUrl(provider: CloudLoginProvider, urls: CloudLoginUrlSources): string {
  switch (provider) {
    case 'google': return urls.google();
    case 'discord': return urls.discord();
    case 'upkk': return urls.upkk();
    case 'steam': return urls.steam();
  }
}

export function planCloudLoginStart(
  isTauri: boolean,
  provider: CloudLoginProvider,
  urls: CloudLoginUrlSources,
): CloudLoginStartPlan {
  const url = cloudLoginUrl(provider, urls);
  if (!isTauri) {
    return { type: 'browser-preview', url, error: BROWSER_PREVIEW_LOGIN_ERROR };
  }
  return { type: 'tauri', url, timeoutMs: CLOUD_LOGIN_TIMEOUT_MS };
}

export function shouldFinishLoginOnWindowClose(disposed: boolean, loginCompleted: boolean): boolean {
  return !disposed && !loginCompleted;
}

export async function restoreCloudAuthSession(deps: {
  initializeToken: () => Promise<{ token?: string | null }>;
  checkStatus: () => Promise<AuthStatus>;
}): Promise<CloudAuthRestoreResult> {
  const result = await deps.initializeToken();
  if (!result.token) return { type: 'logged-out' };
  try {
    const status = await deps.checkStatus();
    return status.logged_in ? { type: 'authenticated', status } : { type: 'invalid' };
  } catch (reason) {
    return { type: 'deferred', reason };
  }
}

export async function completeCloudLogin(
  token: string,
  user: unknown,
  deps: CompleteCloudLoginDeps,
): Promise<void> {
  await deps.persistToken(token);
  deps.setAuthenticated({ logged_in: true, user: normalizeCallbackUser(user) });
  try {
    const status = await deps.checkStatus();
    if (status.logged_in) deps.setAuthenticated(status);
    else await deps.invalidate();
  } catch (reason) {
    deps.onDeferredVerification(reason);
  }
  deps.finishLoginAttempt();
  deps.setError(null);
  deps.clearResponseCache();
  deps.onCompleted();
}

export async function applyCloudAuthRestoreOutcome(
  outcome: CloudAuthRestoreResult,
  deps: {
    setAuthenticated: (status: AuthStatus) => void;
    invalidate: () => Promise<void>;
    onDeferred: (reason: unknown) => void;
  },
): Promise<void> {
  if (outcome.type === 'logged-out') {
    deps.setAuthenticated({ logged_in: false });
    return;
  }
  if (outcome.type === 'authenticated') {
    deps.setAuthenticated(outcome.status);
    return;
  }
  if (outcome.type === 'invalid') {
    await deps.invalidate();
    return;
  }
  deps.onDeferred(outcome.reason);
}
