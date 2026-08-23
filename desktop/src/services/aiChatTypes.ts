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

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function abortError(): DOMException {
  return new DOMException('The AI request was cancelled', 'AbortError');
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}
