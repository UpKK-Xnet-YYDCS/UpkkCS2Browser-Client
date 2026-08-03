import {
  parseServerAddress,
  queryServersA2S,
  type A2SQueryResult,
  type A2SQueryTarget,
  type QueryServersA2SOptions,
} from './a2s.ts';

export interface MonitorServerInfo {
  key: string;
  name: string;
  mapName: string;
  players: number;
  maxPlayers: number;
  isOnline: boolean;
  gameName: string;
}

export function matchMapPattern(mapName: string, pattern: string): boolean {
  return compileMapPattern(pattern)(mapName);
}

export function compileMapPattern(pattern: string): (mapName: string) => boolean {
  if (!pattern) return () => false;
  const lowerPattern = pattern.toLowerCase().trim();
  if (!lowerPattern) return () => false;
  if (lowerPattern === '*') return mapName => Boolean(mapName);

  const escaped = lowerPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
  try {
    const regex = new RegExp(regexStr);
    return mapName => Boolean(mapName) && regex.test(mapName.toLowerCase());
  } catch {
    const fragment = lowerPattern.replace(/\*/g, '');
    return mapName => Boolean(mapName) && mapName.toLowerCase().includes(fragment);
  }
}

type BatchA2SQuery = (
  targets: A2SQueryTarget[],
  options?: QueryServersA2SOptions,
) => Promise<A2SQueryResult[]>;

export async function queryMonitorServers(
  addresses: Iterable<string>,
  queryBatch: BatchA2SQuery = queryServersA2S,
): Promise<MonitorServerInfo[]> {
  const entries: Array<{ key: string; target: A2SQueryTarget }> = [];
  const seen = new Set<string>();
  for (const address of addresses) {
    if (seen.has(address)) continue;
    seen.add(address);
    const parsed = parseServerAddress(address);
    if (!parsed) continue;
    entries.push({ key: address, target: parsed });
  }

  const results = await queryBatch(entries.map(entry => entry.target), {
    concurrency: 3,
    timeoutMs: 2_000,
  });
  return entries.map((entry, index) => {
    const result = results[index];
    if (result?.success) {
      return {
        key: entry.key,
        name: result.name || entry.key,
        mapName: result.map_name || '',
        players: result.real_players ?? result.players ?? 0,
        maxPlayers: result.max_players ?? 0,
        isOnline: true,
        gameName: result.game || '',
      };
    }
    return {
      key: entry.key,
      name: entry.key,
      mapName: '',
      players: 0,
      maxPlayers: 0,
      isOnline: false,
      gameName: '',
    };
  });
}
