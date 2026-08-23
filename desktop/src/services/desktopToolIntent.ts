import type { ServerStatus } from '@/types';
import { parseServerAddress } from './a2s.ts';
import { hasAny, normalizeName, normalizePunctuation } from './desktopToolText.ts';
import type { DesktopToolRequest, JoinTargetResolution } from './desktopToolTypes.ts';

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
  const address = match[1] + ':' + match[2];
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

function normalizeJoinTargetText(value: string): string {
  return normalizeName(value
    .replace(/(?:请|請|帮我|幫我|我要|想要|吗|嗎|吧|please|can you|could you|を|に|ですか|해줘|주세요)/gi, ' ')
    .replace(/(?:加入|连接|連接|連線|join|connect|接続|参加|접속|참가)/gi, ' ')
    .replace(/(?:服务器|伺服器|server|サーバー|서버)/gi, ' '));
}

function isPronounTarget(value: string): boolean {
  return ['这个', '這個', '它', 'this', 'this one', 'it', 'これ', 'それ', 'その', '이것', '그것', '해당'].includes(value);
}

function hasExplicitJoinIntent(value: string): boolean {
  if (/(?:加入|连接(?!性)|連接(?!性)|連線|接続|参加|접속|참가)/u.test(value)) return true;
  return /\b(?:join|connect)(?:\s+(?:to\s+)?(?:this\s+|that\s+|the\s+)?(?:server\s+)?|\s*$)/i.test(value);
}

function serverName(server: ServerStatus): string {
  return String(server.name || server.Name || serverAddress(server));
}

function serverAddress(server: ServerStatus): string {
  return (server.ip || server.Addr || '') + ':' + (server.port || server.Port || '');
}
