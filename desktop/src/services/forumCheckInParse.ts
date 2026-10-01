import { isDesktopHttpModuleError } from './forumLoginParse.ts';

export interface CheckInResult {
  status: number;
  message: string;
}

export function parseCheckInPayload(data: { status?: number; message?: string } | null | undefined): CheckInResult {
  return {
    status: data?.status ?? 0,
    message: data?.message ?? '签到完成',
  };
}

export function formatCheckInRequestError(error: unknown): string {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return '网络请求失败，请检查网络连接';
  }
  return error instanceof Error ? error.message : '签到请求失败，请稍后重试';
}

/**
 * The WebView fallback repeats a non-idempotent POST, so it only runs when the
 * desktop HTTP plugin could not send anything: outside the desktop runtime
 * (browser preview) or when the plugin module failed to load (the forum login
 * rule). Any other failure is the real result and must surface.
 */
export function shouldFallBackToWebViewCheckIn(error: unknown, desktopRuntime: boolean): boolean {
  return !desktopRuntime || isDesktopHttpModuleError(error);
}

export function checkInStatusGradient(status: number): string {
  return status === 1
    ? 'from-green-400 to-emerald-500'
    : 'from-yellow-400 to-orange-500';
}

