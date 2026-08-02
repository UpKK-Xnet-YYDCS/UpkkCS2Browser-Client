import type { RecommendedServer } from './aiChat.ts';
import type { A2SQueryResult } from './a2s.ts';
import { isTauriAvailable, parseServerAddress, queryServerA2S } from './a2s.ts';
import { getLatencyDetectionSettings, type LatencyDetectionSettings } from './latencySettings.ts';
import type { ServerStatus } from '@/types';

export type DesktopToolRequest =
  | { type: 'test_latency'; address: string }
  | { type: 'find_lowest_latency'; category?: string }
  | { type: 'join_server'; address?: string; targetText: string };

export interface LocalLatencyResult {
  server: RecommendedServer;
  success: boolean;
  latencyMs?: number;
  error?: string;
}

export type JoinTargetResolution =
  | { kind: 'resolved'; server: ServerStatus }
  | { kind: 'ambiguous'; candidates: ServerStatus[] }
  | { kind: 'unresolved' };

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

export function detectDesktopToolIntent(message: string): DesktopToolRequest | null {
  const normalized = normalizePunctuation(message).trim();
  const lower = normalized.toLowerCase();
  const address = extractServerAddress(normalized) ?? undefined;

  if (hasExplicitJoinIntent(lower)) {
    return { type: 'join_server', address, targetText: normalized };
  }

  if (hasAny(lower, [
    '最低延迟', '延迟最低', '最低 ping', '最低ping', '离我最近', '離我最近',
    'lowest latency', 'lowest ping', 'best ping', 'nearest active',
    '最低レイテンシ', '最低ping', '最小ping', '최저 지연', '최저 ping', '가장 가까운',
  ])) {
    return latencyRequest(extractLatencyCategory(lower));
  }

  const asksForLatency = hasAny(lower, [
    '延迟', '延遲', 'ping', 'latency', '测试', '測試', 'test', 'レイテンシ', '測定', '지연', '테스트',
  ]);
  if (address && asksForLatency) {
    return { type: 'test_latency', address };
  }

  if (asksForLatency && hasAny(lower, [
    '寻找', '尋找', '找', '测试', '測試', 'test', 'check', 'server', '服务器', '伺服器', 'サーバー', '서버',
  ])) {
    return latencyRequest(extractLatencyCategory(lower));
  }

  return null;
}

function latencyRequest(category: string | undefined): Extract<DesktopToolRequest, { type: 'find_lowest_latency' }> {
  return category ? { type: 'find_lowest_latency', category } : { type: 'find_lowest_latency' };
}

function extractLatencyCategory(value: string): string | undefined {
  if (/(?:^|[^a-z0-9])(?:bkz|skz|kz)(?:[^a-z0-9]|$)/i.test(value) || value.includes('攀爬') || value.includes('爬墙') || value.includes('爬牆')) {
    return 'KZ';
  }
  if (/(?:^|[^a-z0-9])(?:ze|zombie escape)(?:[^a-z0-9]|$)/i.test(value) || value.includes('僵尸逃跑') || value.includes('殭屍逃跑')) {
    return 'Zombie Escape';
  }
  if (/(?:^|[^a-z0-9])surf(?:[^a-z0-9]|$)/i.test(value) || value.includes('滑翔')) return 'Surf';
  if (/(?:^|[^a-z0-9])bhop(?:[^a-z0-9]|$)/i.test(value) || value.includes('连跳') || value.includes('連跳')) return 'Bunny Hop';
  if (/(?:^|[^a-z0-9])retake(?:[^a-z0-9]|$)/i.test(value) || value.includes('回防')) return 'Retake';
  if (/(?:^|[^a-z0-9])(?:dm|deathmatch)(?:[^a-z0-9]|$)/i.test(value) || value.includes('死斗') || value.includes('死鬥')) return 'Deathmatch';
  if (/(?:^|[^a-z0-9])awp(?:[^a-z0-9]|$)/i.test(value)) return 'AWP';
  return undefined;
}

export function extractServerAddress(message: string): string | null {
  const normalized = normalizePunctuation(message);
  const match = normalized.match(/((?:[a-z0-9-]+\.)*[a-z0-9-]+|(?:\d{1,3}\.){3}\d{1,3}):(\d{1,5})(?!\d)/i);
  if (!match) return null;
  const address = `${match[1]}:${match[2]}`;
  return parseServerAddress(address) ? address : null;
}

export function resolveJoinTarget(
  request: Extract<DesktopToolRequest, { type: 'join_server' }>,
  candidates: ServerStatus[],
  lastSelected: ServerStatus | null,
): JoinTargetResolution {
  if (request.address) {
    const address = request.address.toLowerCase();
    const exact = candidates.find(server => serverAddress(server).toLowerCase() === address);
    return exact ? { kind: 'resolved', server: exact } : { kind: 'unresolved' };
  }

  const target = normalizeJoinTargetText(request.targetText);
  if (!target || isPronounTarget(target)) {
    return lastSelected ? { kind: 'resolved', server: lastSelected } : { kind: 'unresolved' };
  }

  const exact = candidates.filter(server => normalizeName(serverName(server)) === target);
  if (exact.length === 1) return { kind: 'resolved', server: exact[0] };
  if (exact.length > 1) return { kind: 'ambiguous', candidates: exact };

  const partial = candidates.filter(server => {
    const name = normalizeName(serverName(server));
    return name.includes(target) || target.includes(name);
  });
  if (partial.length === 1) return { kind: 'resolved', server: partial[0] };
  if (partial.length > 1) return { kind: 'ambiguous', candidates: partial };
  return { kind: 'unresolved' };
}

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

export function formatLocalLatencyContext(results: LocalLatencyResult[], category?: string): string {
  const successful = results.filter(result => result.success);
  if (successful.length === 0) {
    const scope = category ? ` for category ${category}` : '';
    return `Desktop local A2S probe${scope} returned no usable local RTT. The desktop supports local A2S testing, but this request had no successful result; do not claim that local latency testing is impossible and do not invent latency values.`;
  }
  const lines = successful.slice(0, 6).map((result, index) => {
    const server = result.server;
    return `${index + 1}. ${server.name || `${server.ip}:${server.port}`} | address=${server.ip}:${server.port} | local_rtt_ms=${result.latencyMs} | players=${server.players}/${server.maxPlayers} | map=${server.map || 'unknown'} | country=${server.countryCode || 'unknown'}`;
  });
  const scope = category ? `current active ${category} candidates` : 'current active recommendation candidates';
  return [
    `Desktop-measured A2S RTT for the ${scope} only; this is not a global scan. Use these local measurements directly and do not claim that desktop latency testing is unavailable.`,
    ...lines,
  ].join('\n');
}

export function recommendedServerToStatus(server: RecommendedServer, latencyMs?: number): ServerStatus {
  return {
    ip: server.ip,
    port: server.port,
    name: server.name,
    map_name: server.map,
    players: server.players,
    max_players: server.maxPlayers,
    real_players: server.players,
    category: server.category,
    country_code: server.countryCode,
    online: true,
    is_online: true,
    local_latency_status: latencyMs === undefined ? undefined : 'success',
    local_latency_ms: latencyMs,
  } as ServerStatus;
}

export function a2sResultToStatus(result: A2SQueryResult): ServerStatus {
  return {
    ip: result.ip,
    port: result.port,
    name: result.name,
    map_name: result.map_name,
    game: result.game,
    players: result.real_players,
    real_players: result.real_players,
    max_players: result.max_players,
    bots: result.bots,
    online: result.success,
    is_online: result.success,
    local_latency_status: result.success ? 'success' : 'failed',
    local_latency_ms: result.latency_ms,
    local_latency_error: result.error,
  } as ServerStatus;
}

async function probeRecommendedServer(
  server: RecommendedServer,
  options: ProbeOptions,
  settings: LatencyDetectionSettings,
): Promise<LocalLatencyResult> {
  const key = `${server.ip}:${server.port}`.toLowerCase();
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

function normalizePunctuation(value: string): string {
  return value.replaceAll('：', ':').replaceAll('．', '.');
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function normalizeJoinTargetText(value: string): string {
  return normalizeName(value
    .replace(/(?:请|請|帮我|幫我|我要|想要|吗|嗎|吧|please|can you|could you|を|に|ですか|해줘|주세요)/gi, ' ')
    .replace(/(?:加入|连接|連接|連線|join|connect|接続|参加|접속|참가)/gi, ' ')
    .replace(/(?:服务器|伺服器|server|サーバー|서버)/gi, ' '));
}

function isPronounTarget(value: string): boolean {
  return ['这个', '這個', '它', 'this', 'this one', 'it', 'これ', 'それ', 'その', '이것', '그것', '해당'].includes(value);
}

function hasAny(value: string, terms: string[]): boolean {
  return terms.some(term => value.includes(term));
}

function hasExplicitJoinIntent(value: string): boolean {
  if (/(?:加入|连接(?!性)|連接(?!性)|連線|接続|参加|접속|참가)/u.test(value)) return true;
  return /\b(?:join|connect)(?:\s+(?:to\s+)?(?:this\s+|that\s+|the\s+)?(?:server\s+)?|\s*$)/i.test(value);
}

function serverName(server: ServerStatus): string {
  return String(server.name || server.Name || serverAddress(server));
}

function serverAddress(server: ServerStatus): string {
  return `${server.ip || server.Addr || ''}:${server.port || server.Port || ''}`;
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
