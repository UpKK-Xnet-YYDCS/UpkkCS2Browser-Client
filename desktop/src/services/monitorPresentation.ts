import { parseServerAddress } from './a2s.ts';
import type { MatchedServer } from './monitorTypes.ts';
import type { ServerStatus } from '../types/index.ts';

export function matchedServerToStatus(match: MatchedServer): ServerStatus {
  const parsed = parseServerAddress(match.serverKey);
  return {
    name: match.serverName,
    ip: parsed?.ip ?? match.serverKey,
    port: parsed?.port ?? '',
    map_name: match.mapName,
    players: match.players,
    real_players: match.players,
    max_players: match.maxPlayers,
    online: true,
    is_online: true,
  } as ServerStatus;
}


export function collectMonitoredServerKeys(rules: readonly { selectedServers: readonly string[] }[]): string[] {
  const set = new Set<string>();
  for (const rule of rules) {
    for (const server of rule.selectedServers) set.add(server);
  }
  return Array.from(set);
}

export function formatMonitorClock(isoStr: string | null): string {
  if (!isoStr) return '--';
  return new Date(isoStr).toLocaleTimeString();
}
