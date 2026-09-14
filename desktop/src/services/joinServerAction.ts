import type { ServerStatus } from '@/types';
import { getSkipJoinConfirm } from './joinConfirmPreference.ts';
import { openServerOnce, type JoinUrlOpener } from './steamClient.ts';
import { showToast } from './toast.ts';

export async function requestJoinServer(
  server: ServerStatus,
  onConfirm: (server: ServerStatus) => void,
  options?: { opener?: JoinUrlOpener; skipConfirm?: boolean },
): Promise<'joined' | 'confirm'> {
  const skip = options?.skipConfirm ?? getSkipJoinConfirm();
  if (skip) {
    await openServerOnce(server, options?.opener);
    return 'joined';
  }
  onConfirm(server);
  return 'confirm';
}

export function startJoinServer(
  server: ServerStatus,
  onConfirm: (server: ServerStatus) => void,
  opener?: JoinUrlOpener,
): void {
  void requestJoinServer(server, onConfirm, opener ? { opener } : undefined).catch(cause => {
    showToast(cause instanceof Error ? cause.message : String(cause), '', 'error', 5000);
  });
}
