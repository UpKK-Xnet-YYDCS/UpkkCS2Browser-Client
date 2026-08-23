import type { AuthStatus, UserInfo } from '@/api/auth';

export const CLOUD_USER_CACHE_KEY = 'xproj_cloud_auth_user';
export const LEGACY_AUTH_STATUS_KEY = 'xproj_auth_status';

export function loadCachedAuth(raw: string | null): AuthStatus {
  try {
    const user = JSON.parse(raw || 'null') as UserInfo | null;
    return user ? { logged_in: true, user } : { logged_in: false };
  } catch {
    return { logged_in: false };
  }
}

export function readCachedAuth(
  storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
): AuthStatus {
  try {
    return loadCachedAuth(storage?.getItem(CLOUD_USER_CACHE_KEY) ?? null);
  } catch {
    return { logged_in: false };
  }
}

export function cacheAuth(
  status: AuthStatus,
  storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
): void {
  if (!storage) return;
  try {
    if (status.logged_in && status.user) {
      storage.setItem(CLOUD_USER_CACHE_KEY, JSON.stringify(status.user));
      return;
    }
    storage.removeItem(CLOUD_USER_CACHE_KEY);
    storage.removeItem(LEGACY_AUTH_STATUS_KEY);
  } catch {
    // User metadata caching is optional.
  }
}

export function normalizeCallbackUser(value: unknown): UserInfo | undefined {
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

export function parseLoginCallbackPayload(payload: string): { token: string; user?: unknown } {
  const data = JSON.parse(payload) as { token?: string; user?: unknown; error?: string };
  if (data.error || !data.token) throw new Error(data.error || 'OAuth callback did not include a token');
  return { token: data.token, user: data.user };
}
