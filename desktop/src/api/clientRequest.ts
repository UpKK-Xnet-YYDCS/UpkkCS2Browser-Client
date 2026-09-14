import { logInfo, logWarn, logError, logDebug } from '../services/operationLog.ts';
import {
  delayWithSignal,
  isRequestAbortError,
  mergeAbortSignals,
  throwIfRequestAborted,
} from './clientAbort.ts';
import {
  getCached,
  runDedupedGet,
  setCacheIfCurrent,
  snapshotRequest,
  type RequestSnapshot,
} from './clientCache.ts';
import { XPROJ_USER_AGENT } from './clientConfig.ts';
import { apiHttpFetch } from './clientTransport.ts';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function refreshEndpoint<T>(endpoint: string, maxRetries = 3, signal?: AbortSignal): Promise<T> {
  return fetchWithRetryAttempts<T>(endpoint, undefined, maxRetries, signal, true);
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { data } = await fetchApiResult<T>(endpoint, options);
  return data;
}

async function fetchApiResult<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<{ data: T; snapshot: RequestSnapshot }> {
  const method = options?.method || 'GET';
  const snapshot = snapshotRequest(endpoint);
  const { signal, ...transportOptions } = options ?? {};
  const consumerSignal = signal ?? undefined;
  if (method === 'GET') {
    const data = await runDedupedGet(
      endpoint,
      sharedSignal => fetchApiImpl<T>(snapshot, transportOptions, sharedSignal),
      consumerSignal,
    );
    return { data, snapshot };
  }
  const data = await fetchApiImpl<T>(snapshot, transportOptions, consumerSignal);
  return { data, snapshot };
}

async function fetchApiImpl<T>(
  snapshot: RequestSnapshot,
  options: RequestInit | undefined,
  transportSignal?: AbortSignal,
): Promise<T> {
  throwIfRequestAborted(transportSignal);
  const url = snapshot.baseUrl + snapshot.endpoint;
  const method = options?.method || 'GET';
  logInfo('API', method + ' ' + snapshot.endpoint);
  logDebug('API', method + ' ' + url);

  const authHeaders: Record<string, string> = {};
  if (snapshot.token) {
    authHeaders['Authorization'] = 'Bearer ' + snapshot.token;
  }

  try {
    const response = await apiHttpFetch(url, {
      ...options,
      signal: mergeAbortSignals(options?.signal ?? undefined, transportSignal),
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

    const data = await response.json() as T;
    logDebug('API', '响应成功');
    return data;
  } catch (error) {
    if (isRequestAbortError(error)) throw error;
    if (error instanceof TypeError && error.message.includes('fetch')) {
      logError('API', 'Network error: ' + snapshot.endpoint);
      throw new Error(
        '网络请求失败: ' + url + ' - 无法连接到服务器。请检查网络连接和API地址配置。当前API地址: ' + snapshot.baseUrl,
        { cause: error },
      );
    }
    if (error instanceof ApiError) {
      logError('API', method + ' ' + snapshot.endpoint + ' → ' + error.status);
    }
    throw error;
  }
}

function isRetryableError(error: unknown): boolean {
  if (isRequestAbortError(error)) return false;
  if (error instanceof TypeError) return true;
  if (error instanceof ApiError) {
    return error.status >= 500;
  }
  return true;
}

async function fetchWithRetryAttempts<T>(
  endpoint: string,
  options: RequestInit | undefined,
  maxRetries: number,
  signal: AbortSignal | undefined,
  bypassCache: boolean,
): Promise<T> {
  const method = options?.method || 'GET';

  if (method === 'GET' && !bypassCache) {
    const cached = getCached<T>(endpoint);
    if (cached !== undefined) return cached;
  }

  let lastError: unknown;
  const requestInit = signal ? { ...options, signal } : options;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    throwIfRequestAborted(signal);
    try {
      const { data, snapshot } = await fetchApiResult<T>(endpoint, requestInit);
      if (method === 'GET') setCacheIfCurrent(snapshot, data);
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1 && isRetryableError(error)) {
        const delay = 1000 * Math.pow(2, attempt);
        logWarn('API', 'Retry ' + (attempt + 1) + '/' + maxRetries + ' ' + endpoint);
        logWarn('API', 'Attempt ' + (attempt + 1) + '/' + maxRetries + ' failed, retrying in ' + delay + 'ms: ' + (error instanceof Error ? error.message : String(error)));
        await delayWithSignal(delay, signal);
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export async function fetchWithRetry<T>(endpoint: string, options?: RequestInit, maxRetries = 3): Promise<T> {
  return fetchWithRetryAttempts<T>(endpoint, options, maxRetries, options?.signal ?? undefined, false);
}

export interface ApiCallOptions {
  signal?: AbortSignal;
}
