import type { UserSession } from '../types/user.ts';

export const USER_SESSION_STORAGE_KEY = 'xproj-user-session';
export const REMEMBER_ME_STORAGE_KEY = 'xproj-remember-me';

export function persistUserSession(
  user: UserSession | null,
  storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage,
): void {
  if (user) {
    storage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(user));
    return;
  }
  storage.removeItem(USER_SESSION_STORAGE_KEY);
}

export function persistRememberMeFlag(
  rememberMe: boolean,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(REMEMBER_ME_STORAGE_KEY, rememberMe ? 'true' : 'false');
}

export function readRememberMeFlag(raw: string | null): boolean {
  return raw === null ? true : raw === 'true';
}
