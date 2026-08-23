import {
  AI_MAX_RETRIES,
  AIChatRequestError,
  abortError,
  isAbortError,
  throwIfAborted,
  type AIChatEvent,
  type AIChatFetch,
  type AIChatRequest,
  type AIChatStreamOptions,
  type RecommendedServer,
} from './aiChatTypes.ts';
import { consumeAIChatSSE } from './aiChatSse.ts';

export async function streamAIChat(request: AIChatRequest, options: AIChatStreamOptions): Promise<string> {
  const fetcher = options.fetcher ?? desktopFetch;
  let baseUrl = options.baseUrl;
  let token = options.token;
  if (baseUrl === undefined || token === undefined) {
    const { getApiBaseUrl, getApiToken } = await import('@/api/client');
    baseUrl ??= getApiBaseUrl();
    token = token === undefined ? getApiToken() : token;
  }
  const maxRetries = options.maxRetries ?? AI_MAX_RETRIES;
  let partialContent = request.continue_from ?? '';

  for (let retry = 0; ; retry += 1) {
    throwIfAborted(options.signal);
    try {
      const response = await fetcher(`${baseUrl}/api/ai-chat`, {
        method: 'POST',
        signal: options.signal,
        headers: requestHeaders(token, request.language, true),
        body: JSON.stringify({
          ...request,
          history: request.history.slice(-10),
          continue_from: partialContent || undefined,
        }),
      });
      if (!response.ok || !response.body) {
        throw new AIChatRequestError(
          response.status === 401 ? 'Login required to use AI chat' : `AI request failed (${response.status})`,
          isTransientStatus(response.status),
          response.status === 401,
        );
      }

      await consumeAIChatSSE(response.body, (event) => {
        if (event.type === 'message' && typeof event.content === 'string') partialContent += event.content;
        if (event.type === 'reset') partialContent = '';
        options.onEvent(event);
        if (event.type === 'error') {
          throw new AIChatRequestError(
            event.error || 'AI request failed',
            isRetryableEvent(event),
            Boolean(event.require_login),
          );
        }
        if (event.type === 'timeout') {
          throw new AIChatRequestError(event.error || 'AI request timed out', true);
        }
      }, options.signal, options.stallTimeoutMs);
      return partialContent;
    } catch (error) {
      if (options.signal.aborted || isAbortError(error)) throw abortError();
      const attempt = retry + 1;
      if (!isRetryableError(error) || attempt > maxRetries) throw error;
      options.onEvent({ type: 'retry', attempt, max: maxRetries });
      await (options.retryWait ?? retryDelay)(attempt, options.signal);
    }
  }
}

export async function fetchRecommendedServers(
  language: string,
  signal?: AbortSignal,
  fetcher: AIChatFetch = desktopFetch,
  category?: string,
): Promise<RecommendedServer[]> {
  const { getApiBaseUrl, getApiToken } = await import('@/api/client');
  const endpoint = category?.trim()
    ? `${getApiBaseUrl()}/api/servers/by-category?category=${encodeURIComponent(category.trim())}&region=all&page=1&per_page=6`
    : `${getApiBaseUrl()}/api/ai-chat/recommend`;
  const response = await fetcher(endpoint, {
    method: 'GET',
    signal,
    headers: requestHeaders(getApiToken(), language, false),
  });
  if (!response.ok) throw new Error(`Recommendations failed (${response.status})`);
  const payload = await response.json() as { servers?: unknown[] };
  return (payload.servers ?? []).map(normalizeServer).filter((server) => server.ip && server.port);
}

async function desktopFetch(input: string, init: RequestInit): Promise<Response> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    return tauriFetch(input, init);
  }
  return fetch(input, init);
}

function requestHeaders(token: string | null, language: string, stream: boolean): Record<string, string> {
  return {
    Accept: stream ? 'text/event-stream' : 'application/json',
    ...(stream ? { 'Content-Type': 'application/json' } : {}),
    'Accept-Language': language,
    'X-Client-UA': clientUserAgent(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function clientUserAgent(): string {
  return typeof __XPROJ_HTTP_USER_AGENT__ === 'string'
    ? __XPROJ_HTTP_USER_AGENT__
    : 'XProj-Desktop-HTTP/test';
}

function retryDelay(attempt: number, signal: AbortSignal): Promise<void> {
  const delay = Math.min(2 ** Math.max(1, attempt), 32) * 1000;
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delay);
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function isRetryableEvent(event: AIChatEvent): boolean {
  if (event.require_login || event.rate_limited) return false;
  if (event.timeout || event.type === 'timeout') return true;
  const message = String(event.error ?? '').toLowerCase();
  return !['login required', 'not enabled', 'not configured', 'invalid request', 'message is required', 'too long', 'rate limit']
    .some((pattern) => message.includes(pattern));
}

function isRetryableError(error: unknown): boolean {
  return error instanceof AIChatRequestError ? error.retryable : !isAbortError(error);
}


function normalizeServer(value: unknown): RecommendedServer {
  const server = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    ip: text(server.ip),
    port: text(server.port),
    name: text(server.name),
    map: text(server.map ?? server.map_name),
    players: numeric(server.players ?? server.real_players),
    maxPlayers: numeric(server.max_players),
    category: text(server.category),
    countryCode: text(server.country_code),
  };
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function numeric(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
