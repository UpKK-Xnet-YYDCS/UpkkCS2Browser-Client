import type { MatchedServer } from './monitorTypes.ts';
import { DEFAULT_MESSAGE_TEMPLATE } from './monitorTypes.ts';

const DEFAULT_API_BASE_URL = 'https://servers.upkk.com';

export function getMapPreviewUrl(mapName: string, storage?: { getItem(key: string): string | null }): string {
  let baseUrl = DEFAULT_API_BASE_URL;
  try {
    const source = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
    const stored = source?.getItem('apiBaseUrl');
    if (stored) baseUrl = stored;
  } catch { /* ignore */ }
  if (!mapName) return baseUrl + '/mapimage/default_1.webp';
  return baseUrl + '/mapimage/' + encodeURIComponent(mapName) + '.webp';
}

export function formatNotificationMessage(
  template: string,
  server: MatchedServer,
  formatTime: () => string = () => new Date().toLocaleString(),
): string {
  const t = template || DEFAULT_MESSAGE_TEMPLATE;
  return t
    .replace(/\{servername\}/gi, server.serverName)
    .replace(/\{mapname\}/gi, server.mapName)
    .replace(/\{players\}/gi, String(server.players))
    .replace(/\{maxplayers\}/gi, String(server.maxPlayers))
    .replace(/\{address\}/gi, server.serverKey)
    .replace(/\{rulename\}/gi, server.matchedRule)
    .replace(/\{pattern\}/gi, server.matchedPattern)
    .replace(/\{time\}/gi, formatTime())
    .replace(/\{mapimage\}/gi, getMapPreviewUrl(server.mapName));
}

