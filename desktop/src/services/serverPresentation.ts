import type { Player, ServerStatus } from '@/types';

export function resolveServerAddress(server: ServerStatus): {
  serverIp: string;
  serverPort: string | number;
  baseAddress: string;
  displayAddress: string;
} {
  const serverIp = server.ip || server.Addr || '';
  const serverPort = server.port || server.Port || '';
  const rawBaseAddress = server.display_address || serverIp;
  const baseAddress = rawBaseAddress.includes(':') ? rawBaseAddress.split(':')[0] : rawBaseAddress;
  const displayAddress = serverPort ? baseAddress + ':' + String(serverPort) : baseAddress;
  return Object.freeze({ serverIp, serverPort, baseAddress, displayAddress });
}

export function resolveServerPresentation(server: ServerStatus) {
  const address = resolveServerAddress(server);
  return Object.freeze({
    ...address,
    serverName: server.name || server.Name || 'Unknown Server',
    serverMap: server.map_name || server.Map || 'Unknown',
    serverPlayers: server.players ?? server.Players ?? 0,
    serverMaxPlayers: server.max_players ?? server.MaxPlayers ?? 0,
    serverBots: server.bots ?? server.Bots ?? 0,
    serverCountry: server.country_name || server.Country || '',
    serverCountryCode: server.country_code || server.CountryCode || '',
    serverVac: server.vac ?? server.VAC ?? false,
    serverGame: server.game || server.GameDesc || '',
    serverCategory: server.category || server.Category || '',
  });
}

export function getPlayerLoadPercent(players: number, maxPlayers: number): number {
  return maxPlayers > 0 ? Math.round((players / maxPlayers) * 100) : 0;
}

export function parseServerPlayersResult(result: unknown): {
  players?: Player[];
  isAuthenticated?: boolean;
} {
  if (!result || typeof result !== 'object') return {};

  const parsed: { players?: Player[]; isAuthenticated?: boolean } = {};
  if ('is_authenticated' in result) {
    parsed.isAuthenticated = Boolean((result as Record<string, unknown>).is_authenticated);
  }
  if ('players' in result) {
    parsed.players = (result as { players: Player[] }).players || [];
  } else if (Array.isArray(result)) {
    parsed.players = result;
  }
  return parsed;
}

export function isListedPlayer(player: Player): boolean {
  const name = player.Name || player.name;
  return Boolean(name && name !== '未知' && name !== 'Unknown');
}

export function getListedPlayerView(player: Player): {
  name: string;
  score: number;
  durationSeconds: number;
  durationLabel?: string;
} {
  return {
    name: player.Name || player.name || '?',
    score: player.Score ?? player.score ?? 0,
    durationSeconds: player.Duration ?? player.duration ?? 0,
    durationLabel: player.DurationStr,
  };
}

export type PlayerLoadBand = 'empty' | 'low' | 'medium' | 'high';

export function getPlayerLoadBand(percent: number): PlayerLoadBand {
  if (percent >= 80) return 'high';
  if (percent >= 50) return 'medium';
  if (percent > 0) return 'low';
  return 'empty';
}

export function getPlayerLoadGradient(percent: number): string {
  switch (getPlayerLoadBand(percent)) {
    case 'high': return 'from-green-400 to-emerald-500';
    case 'medium': return 'from-yellow-400 to-orange-500';
    case 'low': return 'from-blue-400 to-cyan-500';
    default: return 'from-gray-300 to-gray-400';
  }
}

export function getPlayerLoadTextClass(percent: number): string {
  switch (getPlayerLoadBand(percent)) {
    case 'high': return 'text-green-600 dark:text-green-400';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400';
    case 'low': return 'text-blue-600 dark:text-blue-400';
    default: return 'text-gray-500 dark:text-gray-400';
  }
}
