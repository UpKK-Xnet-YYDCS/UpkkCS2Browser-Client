import type { CloudLoginProvider } from '@/types/cloudAuth';

export type CloudLoginAttemptAction =
  | { type: 'started'; provider: CloudLoginProvider }
  | { type: 'finished' };

export function reduceCloudLoginAttempt(
  _current: CloudLoginProvider | null,
  action: CloudLoginAttemptAction,
): CloudLoginProvider | null {
  return action.type === 'started' ? action.provider : null;
}
