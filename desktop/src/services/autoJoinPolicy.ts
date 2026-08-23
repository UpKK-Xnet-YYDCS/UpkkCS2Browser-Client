export const AUTO_JOIN_DEFAULT_INTERVAL = 7;
export const AUTO_JOIN_MIN_INTERVAL = 2;
export const AUTO_JOIN_MAX_INTERVAL = 300;
export const AUTO_JOIN_DEFAULT_MAX_PLAYERS = 64;
export const AUTO_JOIN_DEFAULT_MIN_SLOTS = 4;
export const AUTO_JOIN_MIN_SLOTS_KEY = 'autoJoinMinSlots';
export const AUTO_JOIN_INTERVAL_KEY = 'autoJoinCheckInterval';

export function readStoredAutoJoinMinSlots(storage: { getItem(key: string): string | null } | null): number {
  const saved = storage?.getItem(AUTO_JOIN_MIN_SLOTS_KEY);
  return saved ? parseInt(saved, 10) : AUTO_JOIN_DEFAULT_MIN_SLOTS;
}

export function readStoredAutoJoinInterval(storage: { getItem(key: string): string | null } | null): number {
  const saved = storage?.getItem(AUTO_JOIN_INTERVAL_KEY);
  return saved ? parseInt(saved, 10) : AUTO_JOIN_DEFAULT_INTERVAL;
}

export function clampAutoJoinMinSlots(raw: string): number {
  return Math.max(1, Math.min(10, parseInt(raw, 10) || 1));
}

export function clampAutoJoinInterval(raw: string): number {
  const parsed = parseInt(raw, 10);
  const safeValue = Number.isNaN(parsed) || parsed < 0 ? AUTO_JOIN_DEFAULT_INTERVAL : Math.floor(parsed);
  return Math.max(AUTO_JOIN_MIN_INTERVAL, Math.min(AUTO_JOIN_MAX_INTERVAL, safeValue));
}

export function autoJoinAvailableSlots(realPlayers: number, maxPlayers: number): number {
  return maxPlayers - realPlayers;
}

export function shouldAutoJoin(realPlayers: number, maxPlayers: number, minSlots: number): boolean {
  return autoJoinAvailableSlots(realPlayers, maxPlayers) >= minSlots;
}

export interface AutoJoinPlayerCounts {
  realPlayers: number;
  maxPlayers: number;
}

export function readAutoJoinCountsFromA2S(
  result: { success?: boolean; real_players?: number; max_players?: number } | null | undefined,
): AutoJoinPlayerCounts | null {
  if (!result || !result.success) return null;
  return {
    realPlayers: result.real_players ?? 0,
    maxPlayers: result.max_players ?? AUTO_JOIN_DEFAULT_MAX_PLAYERS,
  };
}

export function readAutoJoinCountsFromApi(
  server: {
    real_players?: number;
    players?: number;
    Players?: number;
    max_players?: number;
    MaxPlayers?: number;
  } | null | undefined,
): AutoJoinPlayerCounts | null {
  if (!server) return null;
  return {
    realPlayers: server.real_players ?? server.players ?? server.Players ?? 0,
    maxPlayers: server.max_players ?? server.MaxPlayers ?? AUTO_JOIN_DEFAULT_MAX_PLAYERS,
  };
}

export function nextAutoJoinCountdown(prev: number, interval: number): number {
  return prev <= 1 ? interval : prev - 1;
}

export function autoJoinTriggerThreshold(maxPlayers: number, minSlots: number): number {
  const threshold = maxPlayers - minSlots;
  return threshold >= 0 ? threshold : 0;
}

