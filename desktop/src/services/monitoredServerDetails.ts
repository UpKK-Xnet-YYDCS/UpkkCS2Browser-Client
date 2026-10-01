import { parseServerAddress, queryServersA2S } from './a2s.ts';
import type { MonitorServerInfo } from './monitorQuery.ts';

export interface MonitoredServerDetails {
  name: string;
  map: string;
  players: number;
  maxPlayers: number;
  updatedAt: string;
}

export interface CheckedMonitorServers {
  at: string;
  servers: MonitorServerInfo[];
}

export function detailsFromMonitorServers(
  servers: readonly MonitorServerInfo[],
  updatedAt: string,
): Map<string, MonitoredServerDetails> {
  const details = new Map<string, MonitoredServerDetails>();
  for (const server of servers) {
    if (!server.isOnline) continue;
    details.set(server.key, {
      name: server.name || server.key,
      map: server.mapName || '--',
      players: server.players,
      maxPlayers: server.maxPlayers,
      updatedAt,
    });
  }
  return details;
}

export function addressesMissingFromCheck(
  addresses: readonly string[],
  servers: readonly MonitorServerInfo[],
): string[] {
  const seen = new Set(servers.map(server => server.key));
  return addresses.filter(address => !seen.has(address));
}

export async function queryMonitoredServerDetails(
  addresses: readonly string[],
  queryBatch = queryServersA2S,
  updatedAt = new Date().toLocaleTimeString(),
): Promise<Map<string, MonitoredServerDetails>> {
  const entries: Array<{ key: string; ip: string; port: string }> = [];
  for (const address of addresses) {
    const parsed = parseServerAddress(address);
    if (!parsed) continue;
    entries.push({ key: address, ip: parsed.ip, port: parsed.port });
  }
  const details = new Map<string, MonitoredServerDetails>();
  if (entries.length === 0) return details;

  const results = await queryBatch(entries.map(entry => ({ ip: entry.ip, port: entry.port })), {
    concurrency: 3,
    timeoutMs: 2_000,
  });
  entries.forEach((entry, index) => {
    const result = results[index];
    if (!result?.success) return;
    details.set(entry.key, {
      name: result.name || entry.key,
      map: result.map_name || '--',
      players: result.real_players ?? result.players ?? 0,
      maxPlayers: result.max_players ?? 0,
      updatedAt,
    });
  });
  return details;
}
