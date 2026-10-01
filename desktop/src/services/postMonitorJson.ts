import { startRequestDeadline } from '../api/clientAbort.ts';
import { getDesktopHttpFetch, releaseResponseBody } from './desktopRuntime.ts';
import { isTauriHttpModuleError } from './monitorChannelPayloads.ts';

export interface MonitorJsonResponse {
  ok: boolean;
  status: number;
}

export type MonitorJsonFetch = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Upper bound for one webhook/Server Chan POST. The monitor schedules its next
 * check only after notifications settle, and reqwest (plugin-http) has no read
 * timeout by default, so an endpoint that never answers must not stall it.
 */
export const MONITOR_REQUEST_TIMEOUT_MS = 15_000;

export async function postJsonWithTimeout(
  fetchImpl: MonitorJsonFetch,
  url: string,
  body: unknown,
  timeoutMs = MONITOR_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const deadline = startRequestDeadline(timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: deadline.signal,
    });
    // Monitor channels only read the status.
    await releaseResponseBody(response);
    return response;
  } finally {
    deadline.dispose();
  }
}

export async function postMonitorJson(url: string, body: unknown): Promise<MonitorJsonResponse> {
  try {
    const tauriFetch = await getDesktopHttpFetch();
    return await postJsonWithTimeout(tauriFetch, url, body);
  } catch (tauriErr) {
    if (!isTauriHttpModuleError(tauriErr)) throw tauriErr;
  }

  return postJsonWithTimeout((input, init) => fetch(input, init), url, body);
}
