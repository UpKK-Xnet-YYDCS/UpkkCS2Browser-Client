import { useSyncExternalStore } from 'react';

export const SKIP_JOIN_CONFIRM_KEY = 'desktopSkipJoinConfirm';
export const DEFAULT_SKIP_JOIN_CONFIRM = true;

const listeners = new Set<() => void>();

export function normalizeSkipJoinConfirm(stored: string | null): boolean {
  return stored !== 'false';
}

export function getSkipJoinConfirm(): boolean {
  try {
    return normalizeSkipJoinConfirm(localStorage.getItem(SKIP_JOIN_CONFIRM_KEY));
  } catch {
    return DEFAULT_SKIP_JOIN_CONFIRM;
  }
}

function notifySkipJoinConfirmChanged(): void {
  for (const listener of listeners) listener();
}

export function setSkipJoinConfirm(enabled: boolean): void {
  try {
    localStorage.setItem(SKIP_JOIN_CONFIRM_KEY, enabled ? 'true' : 'false');
  } catch {
    // Keep the in-session toggle even when storage is unavailable.
  }
  notifySkipJoinConfirmChanged();
}

export function subscribeSkipJoinConfirm(callback: () => void): () => void {
  listeners.add(callback);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SKIP_JOIN_CONFIRM_KEY) callback();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined') window.removeEventListener('storage', handleStorage);
  };
}

export function useSkipJoinConfirm(): boolean {
  return useSyncExternalStore(subscribeSkipJoinConfirm, getSkipJoinConfirm, () => DEFAULT_SKIP_JOIN_CONFIRM);
}
