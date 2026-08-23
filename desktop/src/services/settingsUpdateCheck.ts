export type SettingsUpdateCheckStatus = 'idle' | 'checking' | 'upToDate' | 'error';

export const SETTINGS_UPDATE_STATUS_RESET_MS = 3000;
export const SETTINGS_SAVE_FEEDBACK_MS = 2000;

export function resolveManualUpdateCheckStatus(result: {
  hasUpdate?: boolean;
  error?: string;
} | null): { status: SettingsUpdateCheckStatus; resetMs: number | null } {
  if (!result) return { status: 'error', resetMs: SETTINGS_UPDATE_STATUS_RESET_MS };
  if (result.hasUpdate) return { status: 'idle', resetMs: null };
  if (result.error) return { status: 'error', resetMs: SETTINGS_UPDATE_STATUS_RESET_MS };
  return { status: 'upToDate', resetMs: SETTINGS_UPDATE_STATUS_RESET_MS };
}
