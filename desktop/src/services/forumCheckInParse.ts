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

export function checkInStatusGradient(status: number): string {
  return status === 1
    ? 'from-green-400 to-emerald-500'
    : 'from-yellow-400 to-orange-500';
}

