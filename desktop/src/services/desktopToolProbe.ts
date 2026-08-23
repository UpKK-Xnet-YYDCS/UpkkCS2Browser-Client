import type { RecommendedServer } from './aiChat.ts';
import type { A2SQueryResult } from './a2s.ts';
import { isTauriAvailable, parseServerAddress, queryServerA2S } from './a2s.ts';
import { getLatencyDetectionSettings, type LatencyDetectionSettings } from './latencySettings.ts';
import { normalizePunctuation } from './desktopToolText.ts';
import type { LocalLatencyResult } from './desktopToolTypes.ts';

type LocalA2SQuery = (ip: string, port: string, options: { timeoutMs: number }) => Promise<A2SQueryResult>;

interface ProbeOptions {
  query?: LocalA2SQuery;
  settings?: LatencyDetectionSettings;
  signal?: AbortSignal;
  now?: () => number;
  sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
}

interface CacheEntry {
  result: LocalLatencyResult;
  updatedAt: number;
}

const CACHE_TTL_MS = 60_000;
const latencyCache = new Map<string, CacheEntry>();

export async function probeRecommendedServers(
  candidates: RecommendedServer[],
  options: ProbeOptions = {},
): Promise<LocalLatencyResult[]> {
  const limitedCandidates = candidates.slice(0, 6);
  if (!isTauriAvailable() && !options.query) {
    return limitedCandidates.map(server => ({ server, success: false, error: 'Desktop A2S is unavailable' }));
  }
  const settings = options.settings ?? getLatencyDetectionSettings();
  const results = new Array<LocalLatencyResult>(limitedCandidates.length);
  let nextIndex = 0;
  const workerCount = Math.min(settings.workerCount, limitedCandidates.length);

  const worker = async () => {
    for (;;) {
      throwIfAborted(options.signal);
      const index = nextIndex;
      nextIndex += 1;
      if (index >= limitedCandidates.length) return;
      results[index] = await probeRecommendedServer(limitedCandidates[index], options, settings);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return rankLatencyResults(results);
}

export async function probeServerAddress(address: string, options: ProbeOptions = {}): Promise<LocalLatencyResult> {
  const parsed = parseServerAddress(normalizePunctuation(address));
  if (!parsed) throw new Error('Invalid server address');
  const result = await runA2SQuery(parsed.ip, parsed.port, options, options.settings ?? getLatencyDetectionSettings());
  return {
    server: result.success ? recommendedFromA2S(result) : emptyRecommendedServer(parsed.ip, parsed.port),
    success: result.success && Number.isFinite(result.latency_ms),
    latencyMs: result.success && Number.isFinite(result.latency_ms) ? Math.round(result.latency_ms ?? 0) : undefined,
    error: result.success ? undefined : result.error,
  };
}

export function rankLatencyResults(results: LocalLatencyResult[]): LocalLatencyResult[] {
  return [...results].sort((left, right) => {
    if (left.success !== right.success) return left.success ? -1 : 1;
    const latencyDifference = (left.latencyMs ?? Number.POSITIVE_INFINITY) - (right.latencyMs ?? Number.POSITIVE_INFINITY);
    if (latencyDifference !== 0) return latencyDifference;
    return right.server.players - left.server.players;
  });
}

async function probeRecommendedServer(
  server: RecommendedServer,
  options: ProbeOptions,
  settings: LatencyDetectionSettings,
): Promise<LocalLatencyResult> {
  const key = (server.ip + ':' + server.port).toLowerCase();
  const now = options.now ?? Date.now;
  const cached = latencyCache.get(key);
  if (cached && now() - cached.updatedAt < CACHE_TTL_MS) return cached.result;

  const queryResult = await runA2SQuery(server.ip, server.port, options, settings);
  const result: LocalLatencyResult = {
    server,
    success: queryResult.success && Number.isFinite(queryResult.latency_ms),
    latencyMs: queryResult.success && Number.isFinite(queryResult.latency_ms) ? Math.round(queryResult.latency_ms ?? 0) : undefined,
    error: queryResult.success ? undefined : queryResult.error,
  };
  latencyCache.set(key, { result, updatedAt: now() });
  return result;
}

async function runA2SQuery(
  ip: string,
  port: string,
  options: ProbeOptions,
  settings: LatencyDetectionSettings,
): Promise<A2SQueryResult> {
  const query = options.query ?? queryServerA2S;
  let lastResult: A2SQueryResult | null = null;
  for (let attempt = 0; attempt <= settings.retryCount; attempt += 1) {
    throwIfAborted(options.signal);
    lastResult = await query(ip, port, { timeoutMs: settings.a2sTimeoutMs });
    throwIfAborted(options.signal);
    if (lastResult.success && Number.isFinite(lastResult.latency_ms)) return lastResult;
    if (attempt < settings.retryCount && settings.retryDelayMs > 0) {
      await (options.sleep ?? abortableSleep)(settings.retryDelayMs, options.signal);
    }
  }
  return lastResult ?? failedA2SResult(ip, port, 'A2S query failed');
}

function abortableSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      globalThis.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal?.aborted) onAbort();
    else signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

function recommendedFromA2S(result: A2SQueryResult): RecommendedServer {
  return {
    ip: result.ip,
    port: result.port,
    name: result.name,
    map: result.map_name,
    players: result.real_players,
    maxPlayers: result.max_players,
    category: '',
    countryCode: '',
  };
}

function emptyRecommendedServer(ip: string, port: string): RecommendedServer {
  return { ip, port, name: '', map: '', players: 0, maxPlayers: 0, category: '', countryCode: '' };
}

function failedA2SResult(ip: string, port: string, error: string): A2SQueryResult {
  return {
    success: false, error, ip, port, name: '', map_name: '', game: '', players: 0,
    max_players: 0, bots: 0, real_players: 0, server_type: '', environment: '',
    password: false, vac: false, version: '',
  };
}
