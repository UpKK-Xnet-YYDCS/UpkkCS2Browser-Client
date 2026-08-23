import { getDesktopHttpFetch } from '@/services/desktopRuntime';
import { logDebug, logInfo } from '@/services/operationLog';
import type { LoginResponse } from '@/types';
import { FORUM_URL, LOGIN_ENDPOINT } from './forumConstants';
import {
  isDesktopHttpModuleError,
  parseLoginResponseText,
} from './forumLoginParse';

export { FORUM_URL, LOGIN_ENDPOINT } from './forumConstants';
export {
  formatForumLoginError,
  isDesktopHttpModuleError,
  parseLoginResponseText,
  sessionFromLoginResponse,
} from './forumLoginParse';

async function readLoginResponse(response: Response): Promise<LoginResponse> {
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Login] HTTP错误响应:', errorText);
    throw new Error(
      'HTTP ' + response.status + ': ' + response.statusText + (errorText ? ' - ' + errorText.substring(0, 100) : ''),
    );
  }

  const responseText = await response.text();
  try {
    return parseLoginResponseText(responseText);
  } catch (parseErr) {
    console.error('[Login] JSON解析失败!');
    console.error('[Login] 原始响应:', responseText);
    console.error('[Login] 解析错误:', parseErr);
    throw parseErr;
  }
}

export async function requestForumLogin(steamid64: string, securecode: string): Promise<LoginResponse> {
  const postBody = new URLSearchParams({ steamid64, securecode }).toString();
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const url = FORUM_URL + LOGIN_ENDPOINT;

  logInfo('Login', '开始登录请求...');
  logDebug('Login', 'URL: ' + url);
  logDebug('Login', 'SteamID64: ' + steamid64);

  try {
    logDebug('Login', '尝试使用 Tauri HTTP 插件...');
    const tauriFetch = await getDesktopHttpFetch();
    const response = await tauriFetch(url, { method: 'POST', headers, body: postBody });
    logDebug('Login', 'Tauri HTTP 响应状态: ' + response.status + ' ' + response.statusText);
    return await readLoginResponse(response);
  } catch (tauriErr) {
    if (!isDesktopHttpModuleError(tauriErr)) {
      console.error('[Login] Tauri HTTP 请求错误:', tauriErr);
      throw tauriErr;
    }
    logDebug('Login', 'Tauri HTTP 不可用, 回退到 fetch...');
  }

  logDebug('Login', '使用标准 fetch...');
  const response = await fetch(url, { method: 'POST', headers, body: postBody });
  logDebug('Login', 'Fetch 响应状态: ' + response.status + ' ' + response.statusText);
  return readLoginResponse(response);
}
