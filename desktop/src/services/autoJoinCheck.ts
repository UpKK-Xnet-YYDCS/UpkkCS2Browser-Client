import {
  autoJoinAvailableSlots,
  readAutoJoinCountsFromA2S,
  readAutoJoinCountsFromApi,
  shouldAutoJoin,
  type AutoJoinPlayerCounts,
} from './autoJoinPolicy.ts';

export const AUTO_JOIN_A2S_TIMEOUT_MS = 2_500;
export const AUTO_JOIN_SUCCESS_CLOSE_MS = 2_000;

export type AutoJoinQueryOutcome =
  | { ok: true; source: 'a2s' | 'api'; counts: AutoJoinPlayerCounts }
  | { ok: false };

export async function queryAutoJoinCounts(deps: {
  ip: string;
  port: string;
  isTauriAvailable: () => boolean;
  queryA2S: (ip: string, port: string, options: { timeoutMs: number }) => Promise<{
    success?: boolean;
    real_players?: number;
    max_players?: number;
  }>;
  refreshServer: (id: number | string) => Promise<unknown>;
}): Promise<AutoJoinQueryOutcome> {
  if (deps.isTauriAvailable()) {
    const a2sResult = await deps.queryA2S(deps.ip, deps.port, { timeoutMs: AUTO_JOIN_A2S_TIMEOUT_MS });
    const counts = readAutoJoinCountsFromA2S(a2sResult);
    if (counts) return { ok: true, source: 'a2s', counts };
  }

  const result = await deps.refreshServer(deps.ip + ':' + deps.port) as { success?: boolean; server?: unknown };
  if (result.success && result.server) {
    const counts = readAutoJoinCountsFromApi(result.server);
    if (counts) return { ok: true, source: 'api', counts };
  }
  return { ok: false };
}

export function formatAutoJoinCountLog(prefix: string, ip: string, port: string, counts: AutoJoinPlayerCounts): string {
  return prefix + ' ' + ip + ':' + port + ' → ' + counts.realPlayers + '/' + counts.maxPlayers;
}

export function formatAutoJoinUsingLog(source: 'a2s' | 'api', counts: AutoJoinPlayerCounts): string {
  return source === 'a2s'
    ? 'Using local A2S query: ' + counts.realPlayers + '/' + counts.maxPlayers
    : 'Using API query: ' + counts.realPlayers + '/' + counts.maxPlayers;
}

export function formatAutoJoinDetectedStatus(detectedLabel: string, availableSlots: number, minSlots: number): string {
  return '✅ ' + detectedLabel + ' ' + availableSlots + ' ≥ ' + minSlots;
}

export function formatAutoJoinWaitingStatus(waitingLabel: string, realPlayers: number, maxPlayers: number): string {
  return waitingLabel + ' (' + realPlayers + '/' + maxPlayers + ')';
}

export function formatAutoJoinSteamLog(serverName: string | undefined, steamUrl: string): string {
  return 'Joining ' + serverName + ' → ' + steamUrl;
}

export function shouldJoinFromCounts(counts: AutoJoinPlayerCounts, minSlots: number): {
  availableSlots: number;
  shouldJoin: boolean;
} {
  return {
    availableSlots: autoJoinAvailableSlots(counts.realPlayers, counts.maxPlayers),
    shouldJoin: shouldAutoJoin(counts.realPlayers, counts.maxPlayers, minSlots),
  };
}

export async function openAutoJoinSteamUrl(
  steamUrl: string,
  deps: {
    isTauriAvailable: () => boolean;
    openExternalUrl: (url: string) => Promise<void>;
    assignLocation: (url: string) => void;
  },
): Promise<{ fallbackError?: unknown }> {
  try {
    if (deps.isTauriAvailable()) {
      await deps.openExternalUrl(steamUrl);
    } else {
      deps.assignLocation(steamUrl);
    }
    return {};
  } catch (error) {
    deps.assignLocation(steamUrl);
    return { fallbackError: error };
  }
}
