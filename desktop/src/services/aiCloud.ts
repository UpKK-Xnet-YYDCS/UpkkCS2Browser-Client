import {getApiBaseUrl, getApiToken} from '@/api/client';
import {getOptionalDesktopHttpFetch} from './desktopRuntime';
import {consumeAIChatSSE} from './aiChatSse';

export type AICloudEvent = Record<string, unknown>;
async function request(path: string, method: string, body?: unknown, signal?: AbortSignal, locale?: string) {
  const fetcher = await getOptionalDesktopHttpFetch() ?? fetch;
  const token = getApiToken();
  return fetcher(`${getApiBaseUrl()}${path}`, {method, signal, headers: {Accept: locale ? 'text/event-stream' : 'application/json',
    ...(body && !(body instanceof FormData) ? {'Content-Type': 'application/json'} : {}), ...(token ? {Authorization: `Bearer ${token}`} : {}),
    ...(locale ? {'Accept-Language': locale} : {})}, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined});
}
export async function aiCloudJSON(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const response = await request(path, method, body, signal);
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok || data.success === false) throw new Error(String(data.error || `HTTP ${response.status}`));
  return data;
}
export async function aiCloudStream(path: string, body: unknown, signal: AbortSignal, onEvent: (event: AICloudEvent) => void, locale: string) {
  const response = await request(path, 'POST', body, signal, locale);
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(String(data.error || `HTTP ${response.status}`));
  }
  await consumeAIChatSSE(response.body, event => {if (event.type === 'error') throw new Error(String(event.error || 'AI request failed')); onEvent(event);}, signal);
}
