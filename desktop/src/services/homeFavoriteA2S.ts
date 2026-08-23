import { queryServerA2S, type A2SQueryResult } from './a2sQuery.ts';
import type { ServerStatus } from '../types/index.ts';

export interface FavoriteA2SAddress {
  ip: string;
  port: string;
}

export interface QueryFavoriteServerOptions {
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
  query?: typeof queryServerA2S;
  sleep?: (ms: number) => Promise<void>;
}

export function makeOfflinePlaceholder(
  ip: string,
  port: string,
  options: {
    now: string;
    latencyStatus: NonNullable<ServerStatus['local_latency_status']>;
  },
): ServerStatus {
  return {
    name: '', ip, port, game: '', region: '', mode: '',
    players: 0, max_players: 0, bots: 0, real_players: 0, map_name: '',
    comments: '', display_address: ip, mapnamecn: '', category: '',
    priority: 0, config_order: 0, admin_sort_priority: 0, submitter_uid: 0,
    country_code: '', country_name: '', continent: '', geo_region: '',
    server_type: '', environment: '',
    vac: false, password: false, version: '', game_id: 0,
    last_updated: options.now, Online: false,
    local_latency_status: options.latencyStatus,
  };
}

export function mapA2SSuccessToServerStatus(
  a2s: A2SQueryResult,
  parsed: FavoriteA2SAddress,
  now: string,
): ServerStatus {
  return {
    name: a2s.name, ip: parsed.ip, port: parsed.port, game: a2s.game,
    region: '', mode: '', players: a2s.players, max_players: a2s.max_players,
    bots: a2s.bots, real_players: a2s.real_players, map_name: a2s.map_name,
    comments: '', display_address: parsed.ip, mapnamecn: '', category: '',
    priority: 0, config_order: 0, admin_sort_priority: 0, submitter_uid: 0,
    country_code: '', country_name: '', continent: '', geo_region: '',
    server_type: a2s.server_type,
    environment: a2s.environment, vac: a2s.vac, password: a2s.password,
    version: a2s.version, game_id: 0,
    last_updated: now, Online: true,
    local_latency_status: Number.isFinite(a2s.latency_ms) ? 'success' : 'failed',
    local_latency_ms: Number.isFinite(a2s.latency_ms) ? Math.round(a2s.latency_ms ?? 0) : undefined,
    local_latency_error: Number.isFinite(a2s.latency_ms) ? undefined : 'A2S latency unavailable',
    local_latency_updated_at: now,
  };
}

export function mapA2SFailurePatch(error: string, now: string): Pick<
  ServerStatus,
  'local_latency_status' | 'local_latency_error' | 'local_latency_updated_at'
> {
  return {
    local_latency_status: 'failed',
    local_latency_error: error,
    local_latency_updated_at: now,
  };
}

function failedFavoriteQuery(parsed: FavoriteA2SAddress, error: unknown): A2SQueryResult {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
    ip: parsed.ip,
    port: parsed.port,
    name: '',
    map_name: '',
    game: '',
    players: 0,
    max_players: 0,
    bots: 0,
    real_players: 0,
    server_type: '',
    environment: '',
    password: false,
    vac: false,
    version: '',
  };
}

export async function queryFavoriteServerWithRetry(
  parsed: FavoriteA2SAddress,
  options: QueryFavoriteServerOptions,
): Promise<A2SQueryResult | null> {
  const query = options.query ?? queryServerA2S;
  const sleep = options.sleep ?? ((ms: number) => new Promise(resolve => window.setTimeout(resolve, ms)));
  let lastResult: A2SQueryResult | null = null;

  for (let attempt = 0; attempt <= options.retryCount; attempt += 1) {
    try {
      const result = await Promise.race([
        query(parsed.ip, parsed.port, { timeoutMs: options.timeoutMs }),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), options.timeoutMs)
        ),
      ]);
      if (result?.success) return result;
      lastResult = result;
    } catch (error) {
      lastResult = failedFavoriteQuery(parsed, error);
    }
    if (attempt < options.retryCount && options.retryDelayMs > 0) {
      await sleep(options.retryDelayMs);
    }
  }

  return lastResult;
}

export function replaceFavoriteServerInPlace(
  servers: readonly ServerStatus[],
  parsed: FavoriteA2SAddress,
  next: ServerStatus | ((current: ServerStatus) => ServerStatus),
): ServerStatus[] {
  return servers.map(server => {
    if (server.ip !== parsed.ip || server.port !== parsed.port) return server;
    return typeof next === 'function' ? next(server) : next;
  });
}
