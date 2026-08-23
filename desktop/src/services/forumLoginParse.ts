import type { LoginResponse, UserSession } from '../types/user.ts';

export function sessionFromLoginResponse(data: LoginResponse): UserSession | null {
  if (!data.success || !data.data) return null;
  return {
    uid: data.data.uid,
    username: data.data.username,
    steamid64: data.data.steamid64,
    user_auth: data.data.user_auth,
    isLogin: data.data.isLogin ?? true,
  };
}

export function parseLoginResponseText(responseText: string): LoginResponse {
  try {
    return JSON.parse(responseText) as LoginResponse;
  } catch (parseErr) {
    throw new Error('响应解析失败: ' + responseText.substring(0, 100), { cause: parseErr });
  }
}

export function isDesktopHttpModuleError(error: unknown): boolean {
  const errMsg = error instanceof Error ? error.message : String(error);
  return errMsg.includes('module')
    || errMsg.includes('import')
    || errMsg.includes('Cannot find')
    || errMsg.includes('Failed to resolve');
}

export function formatForumLoginError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return '网络请求失败: 无法连接到服务器。请检查网络连接。(' + error.message + ')';
    }
    if (error.message.includes('CORS')) {
      return '跨域请求被阻止: ' + error.message;
    }
    return error.message;
  }
  return '登录请求失败: ' + String(error);
}

