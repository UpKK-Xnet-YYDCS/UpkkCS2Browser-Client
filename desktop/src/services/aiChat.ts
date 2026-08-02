export const AI_MAX_RETRIES = 5;
export const AI_STALL_TIMEOUT_MS = 90_000;

export interface AIChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatRequest {
  message: string;
  history: AIChatHistoryMessage[];
  instructions?: string;
  context?: string;
  language: string;
  continue_from?: string;
}

export interface AIChatEvent {
  type: 'queue' | 'retrieving' | 'processing' | 'http_status' | 'thinking' | 'message' |
    'retry' | 'grounding' | 'action' | 'reset' | 'complete' | 'error' | 'timeout' | string;
  content?: string;
  error?: string;
  position?: number;
  queue_size?: number;
  attempt?: number;
  max?: number;
  require_login?: boolean;
  rate_limited?: boolean;
  timeout?: boolean;
  lookups?: number;
  actions?: number;
  action?: string;
  status?: string;
  address?: string;
  [key: string]: unknown;
}

export interface RecommendedServer {
  ip: string;
  port: string;
  name: string;
  map: string;
  players: number;
  maxPlayers: number;
  category: string;
  countryCode: string;
}

export type AIChatFetch = (input: string, init: RequestInit) => Promise<Response>;

export interface AIChatStreamOptions {
  signal: AbortSignal;
  onEvent(event: AIChatEvent): void;
  fetcher?: AIChatFetch;
  baseUrl?: string;
  token?: string | null;
  stallTimeoutMs?: number;
  maxRetries?: number;
  retryWait?: (attempt: number, signal: AbortSignal) => Promise<void>;
}

export class AIChatRequestError extends Error {
  readonly retryable: boolean;
  readonly requireLogin: boolean;

  constructor(message: string, retryable: boolean, requireLogin = false) {
    super(message);
    this.name = 'AIChatRequestError';
    this.retryable = retryable;
    this.requireLogin = requireLogin;
  }
}

export function parseSSEText(buffer: string, flush = false): { events: AIChatEvent[]; rest: string } {
  const chunks = buffer.split(/\r?\n\r?\n/);
  let rest = chunks.pop() ?? '';
  if (flush && rest.trim()) {
    chunks.push(rest);
    rest = '';
  }

  const events: AIChatEvent[] = [];
  for (const chunk of chunks) {
    const data = chunk.split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) continue;
    events.push(JSON.parse(data) as AIChatEvent);
  }
  return { events, rest };
}

export async function consumeAIChatSSE(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: AIChatEvent) => void,
  signal: AbortSignal,
  stallTimeoutMs = AI_STALL_TIMEOUT_MS,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;

  try {
    for (;;) {
      const result = await readWithTimeout(reader, signal, stallTimeoutMs);
      buffer += decoder.decode(result.value, { stream: !result.done });
      const parsed = parseSSEText(buffer, result.done);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        if (event.type === 'complete') completed = true;
        onEvent(event);
      }
      if (result.done) break;
    }
    if (!completed) throw new AIChatRequestError('AI stream ended before completion', true);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

export async function streamAIChat(request: AIChatRequest, options: AIChatStreamOptions): Promise<string> {
  const fetcher = options.fetcher ?? desktopFetch;
  let baseUrl = options.baseUrl;
  let token = options.token;
  if (baseUrl === undefined || token === undefined) {
    const api = await import('@/api');
    baseUrl ??= api.getApiBaseUrl();
    token = token === undefined ? api.getApiToken() : token;
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
  const api = await import('@/api');
  const endpoint = category?.trim()
    ? `${api.getApiBaseUrl()}/api/servers/by-category?category=${encodeURIComponent(category.trim())}&region=all&page=1&per_page=6`
    : `${api.getApiBaseUrl()}/api/ai-chat/recommend`;
  const response = await fetcher(endpoint, {
    method: 'GET',
    signal,
    headers: requestHeaders(api.getApiToken(), language, false),
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

async function readWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  throwIfAborted(signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortHandler: (() => void) | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AIChatRequestError('AI stream stalled before completion', true)), timeoutMs);
        abortHandler = () => reject(abortError());
        signal.addEventListener('abort', abortHandler, { once: true });
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (abortHandler) signal.removeEventListener('abort', abortHandler);
  }
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

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function abortError(): DOMException {
  return new DOMException('The AI request was cancelled', 'AbortError');
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
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
