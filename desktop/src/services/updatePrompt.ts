export interface AutoUpdateCheckResult {
  hasUpdate: boolean;
  updateInfo?: {
    version: string;
    mandatory?: boolean;
  } | null;
  error?: string;
}

export type AutoUpdatePrompt<T extends AutoUpdateCheckResult = AutoUpdateCheckResult> =
  | { kind: 'prompt'; info: NonNullable<T['updateInfo']> }
  | { kind: 'dismissed'; version: string }
  | { kind: 'error'; error: string }
  | { kind: 'none' };

export function resolveAutoUpdatePrompt<T extends AutoUpdateCheckResult>(
  result: T,
  isDismissed: (version: string) => boolean,
): AutoUpdatePrompt<T> {
  if (result.hasUpdate && result.updateInfo) {
    if (!result.updateInfo.mandatory && isDismissed(result.updateInfo.version)) {
      return { kind: 'dismissed', version: result.updateInfo.version };
    }
    return { kind: 'prompt', info: result.updateInfo };
  }
  if (result.error) return { kind: 'error', error: result.error };
  return { kind: 'none' };
}

