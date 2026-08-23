import { logInfo, logWarn, logError, logDebug } from '@/services/operationLog';
import { getOptionalDesktopHttpFetch } from '@/services/desktopRuntime';
import { getCached, runDedupedGet, setCache } from './clientCache';
import { XPROJ_USER_AGENT, getApiToken, getBaseUrl } from './clientConfig';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function refreshEndpoint<T>(endpoint: string, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fetchApi<T>(endpoint);
      setCache(endpoint, result);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1 && isRetryableError(error)) {
        const delay = 1000 * Math.pow(2, attempt);
        logWarn('API', 'refreshEndpoint retry ' + (attempt + 1) + '/' + maxRetries + ' ' + endpoint);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const method = options?.method || 'GET';
  if (method === 'GET') {
    return runDedupedGet(endpoint, () => fetchApiImpl<T>(endpoint, options));
  }
  return fetchApiImpl<T>(endpoint, options);
}

async function fetchApiImpl<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = baseUrl + endpoint;
  const method = options?.method || 'GET';
  logInfo('API', method + ' ' + endpoint);
  logDebug('API', method + ' ' + url);

  const token = getApiToken();
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders['Authorization'] = 'Bearer ' + token;
  }

  try {
    const tauriFetch = await getOptionalDesktopHttpFetch();
    if (tauriFetch) {
      const response = await tauriFetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': XPROJ_USER_AGENT,
          'X-Client-UA': XPROJ_USER_AGENT,
          ...authHeaders,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new ApiError(
          'API请求失败: ' + url + ' - 状态码: ' + response.status + ' ' + response.statusText + (errorText ? ' - 响应: ' + errorText.substring(0, 200) : ''),
          response.status,
        );
      }

      const data = await response.json();
      logDebug('API', '响应成功');
      return data;
    } else {
      logDebug('API', 'Tauri HTTP 不可用, 回退到 fetch...');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': XPROJ_USER_AGENT,
        'X-Client-UA': XPROJ_USER_AGENT,
        ...authHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new ApiError(
        'API请求失败: ' + url + ' - 状态码: ' + response.status + ' ' + response.statusText + (errorText ? ' - 响应: ' + errorText.substring(0, 200) : ''),
        response.status,
      );
    }

    const data = await response.json();
    logDebug('API', '响应成功');
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      logError('API', 'Network error: ' + endpoint);
      throw new Error(
        '网络请求失败: ' + url + ' - 无法连接到服务器。请检查网络连接和API地址配置。当前API地址: ' + baseUrl,
        { cause: error },
      );
    }
    if (error instanceof ApiError) {
      logError('API', method + ' ' + endpoint + ' → ' + error.status);
    }
    throw error;
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof ApiError) {
    return error.status >= 500;
  }
  return true;
}

export async function fetchWithRetry<T>(endpoint: string, options?: RequestInit, maxRetries = 3): Promise<T> {
  const method = options?.method || 'GET';

  if (method === 'GET') {
    const cached = getCached<T>(endpoint);
    if (cached !== undefined) return cached;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fetchApi<T>(endpoint, options);
      if (method === 'GET') setCache(endpoint, result);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1 && isRetryableError(error)) {
        const delay = 1000 * Math.pow(2, attempt);
        logWarn('API', 'Retry ' + (attempt + 1) + '/' + maxRetries + ' ' + endpoint);
        logWarn('API', 'Attempt ' + (attempt + 1) + '/' + maxRetries + ' failed, retrying in ' + delay + 'ms: ' + (error instanceof Error ? error.message : String(error)));
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}
