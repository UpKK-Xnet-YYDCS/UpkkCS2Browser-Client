import { isTauriHttpModuleError } from './monitorChannelPayloads.ts';

export interface MonitorJsonResponse {
  ok: boolean;
  status: number;
}

export async function postMonitorJson(url: string, body: unknown): Promise<MonitorJsonResponse> {
  try {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    return await tauriFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (tauriErr) {
    if (!isTauriHttpModuleError(tauriErr)) throw tauriErr;
  }

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

