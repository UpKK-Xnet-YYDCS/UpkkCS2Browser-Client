import type { ServerStatus } from '../types/server.ts';

export function getServerEntityKey(server: ServerStatus): string {
  return `${String(server.ip || server.Addr || '')}:${String(server.port || server.Port || '')}`;
}

export function normalizeServerStatus(server: ServerStatus): ServerStatus {
  return {
    ...server,
    name: server.name || server.Name || '',
    ip: server.ip || server.Addr || '',
    port: server.port || server.Port || '',
    game: server.game || server.GameDesc || server.GameDir || '',
    players: server.players ?? server.Players ?? 0,
    max_players: server.max_players ?? server.MaxPlayers ?? 0,
    bots: server.bots ?? server.Bots ?? 0,
    real_players: server.real_players ?? Math.max(0, (server.players ?? server.Players ?? 0) - (server.bots ?? server.Bots ?? 0)),
    map_name: server.map_name || server.Map || '',
    category: server.category || server.Category || '',
    country_name: server.country_name || server.Country || '',
    country_code: server.country_code || server.CountryCode || '',
    vac: server.vac ?? server.VAC ?? false,
    password: server.password ?? server.Visibility ?? false,
    version: server.version || server.Version || '',
  };
}

function equivalentValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return left.every((value, index) => {
    const other = right[index];
    if (Object.is(value, other)) return true;
    if (!value || !other || typeof value !== 'object' || typeof other !== 'object') return false;
    const keys = Object.keys(value as object);
    const otherKeys = Object.keys(other as object);
    return keys.length === otherKeys.length && keys.every(key => (
      Object.is((value as Record<string, unknown>)[key], (other as Record<string, unknown>)[key])
    ));
  });
}

export function areServerEntitiesEquivalent(left: ServerStatus, right: ServerStatus): boolean {
  const leftKeys = Object.keys(left) as Array<keyof ServerStatus>;
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every(key => equivalentValue(left[key], right[key]));
}

export function reconcileServerEntities(
  previous: ServerStatus[],
  incoming: ServerStatus[],
): ServerStatus[] {
  if (incoming.length === 0) return incoming;
  const previousByKey = new Map(previous.map(server => [getServerEntityKey(server), server]));
  return incoming.map(server => {
    const normalized = normalizeServerStatus(server);
    const existing = previousByKey.get(getServerEntityKey(normalized));
    return existing && areServerEntitiesEquivalent(existing, normalized) ? existing : normalized;
  });
}
