import test from 'node:test';
import assert from 'node:assert/strict';
import type { A2SQueryResult } from './a2s.ts';
import type { RecommendedServer } from './aiChat.ts';
import type { LatencyDetectionSettings } from './latencySettings.ts';
import {
  detectDesktopToolIntent,
  extractServerAddress,
  formatLocalLatencyContext,
  probeRecommendedServers,
  rankLatencyResults,
  resolveJoinTarget,
  type LocalLatencyResult,
} from './desktopTools.ts';
import type { ServerStatus } from '@/types';

const settings: LatencyDetectionSettings = {
  deepScanEnabled: true,
  workerCount: 2,
  retryCount: 1,
  retryDelayMs: 0,
  a2sTimeoutMs: 2_000,
};

test('detects multilingual desktop latency and join intents', () => {
  assert.equal(detectDesktopToolIntent('找出延迟最低的服务器')?.type, 'find_lowest_latency');
  assert.equal(detectDesktopToolIntent('show me the lowest ping')?.type, 'find_lowest_latency');
  assert.equal(detectDesktopToolIntent('最低レイテンシのサーバー')?.type, 'find_lowest_latency');
  assert.equal(detectDesktopToolIntent('최저 ping 서버')?.type, 'find_lowest_latency');
  assert.deepEqual(detectDesktopToolIntent('帮我寻找kz服务器并测试延迟'), {
    type: 'find_lowest_latency',
    category: 'KZ',
  });
  assert.deepEqual(detectDesktopToolIntent('测试 203．0．113．7：27015 延迟'), {
    type: 'test_latency',
    address: '203.0.113.7:27015',
  });
  assert.equal(detectDesktopToolIntent('请加入 Example Server')?.type, 'join_server');
  assert.equal(detectDesktopToolIntent('介绍一下网络延迟'), null);
  assert.equal(detectDesktopToolIntent('介绍一下这个服务器的连接性'), null);
});

test('extracts and validates server addresses without requiring whitespace', () => {
  assert.equal(extractServerAddress('加入203.0.113.8:27015'), '203.0.113.8:27015');
  assert.equal(extractServerAddress('connect example.com:27016 please'), 'example.com:27016');
  assert.equal(extractServerAddress('connect 999.999.999.999:70000'), null);
});

test('resolves unique names, pronouns, and ambiguous join targets safely', () => {
  const alpha = status('Alpha Server', '203.0.113.10');
  const alphaTwo = status('Alpha Retake', '203.0.113.11');
  const beta = status('Beta Server', '203.0.113.12');

  const exact = resolveJoinTarget(
    { type: 'join_server', targetText: '请加入 Beta Server' },
    [alpha, alphaTwo, beta],
    null,
  );
  assert.equal(exact.kind, 'resolved');
  if (exact.kind === 'resolved') assert.equal(exact.server.ip, beta.ip);

  const ambiguous = resolveJoinTarget(
    { type: 'join_server', targetText: '加入 Alpha 服务器' },
    [alpha, alphaTwo, beta],
    null,
  );
  assert.equal(ambiguous.kind, 'ambiguous');

  const pronoun = resolveJoinTarget(
    { type: 'join_server', targetText: '加入这个服务器' },
    [alpha, beta],
    beta,
  );
  assert.equal(pronoun.kind, 'resolved');

  const unresolved = resolveJoinTarget(
    { type: 'join_server', targetText: '加入这个服务器' },
    [alpha, beta],
    null,
  );
  assert.equal(unresolved.kind, 'unresolved');
});

test('ranks successful probes by latency then active players and formats bounded context', () => {
  const results: LocalLatencyResult[] = [
    result(server('Slow', '203.0.113.20', 20), true, 80),
    result(server('Fast low population', '203.0.113.21', 3), true, 25),
    result(server('Fast active', '203.0.113.22', 18), true, 25),
    result(server('Offline', '203.0.113.23', 0), false),
  ];
  const ranked = rankLatencyResults(results);
  assert.deepEqual(ranked.map(item => item.server.name), ['Fast active', 'Fast low population', 'Slow', 'Offline']);
  const context = formatLocalLatencyContext(ranked);
  assert.match(context, /current active recommendation candidates only/);
  assert.match(context, /local_rtt_ms=25/);
  assert.match(context, /do not claim that desktop latency testing is unavailable/);
  assert.doesNotMatch(context, /Offline/);
});

test('limits probe concurrency, retries failures, and reuses the 60 second cache', async () => {
  const candidates = [
    server('One', '198.51.100.101', 5),
    server('Two', '198.51.100.102', 10),
    server('Three', '198.51.100.103', 15),
  ];
  let active = 0;
  let maximumActive = 0;
  const calls = new Map<string, number>();
  const query = async (ip: string, port: string): Promise<A2SQueryResult> => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    calls.set(ip, (calls.get(ip) ?? 0) + 1);
    await new Promise(resolve => setTimeout(resolve, 5));
    active -= 1;
    const attempt = calls.get(ip) ?? 1;
    if (ip.endsWith('102') && attempt === 1) return a2s(ip, port, false);
    return a2s(ip, port, true, Number(ip.split('.').at(-1)) - 90);
  };

  const first = await probeRecommendedServers(candidates, { query, settings, now: () => 1_000 });
  assert.equal(maximumActive, 2);
  assert.equal(calls.get('198.51.100.102'), 2);
  assert.equal(first.filter(item => item.success).length, 3);

  await probeRecommendedServers(candidates, { query, settings, now: () => 2_000 });
  assert.equal(calls.get('198.51.100.101'), 1);
  assert.equal(calls.get('198.51.100.102'), 2);
});

test('probes at most six active recommendation candidates', async () => {
  const candidates = Array.from({ length: 8 }, (_, index) =>
    server(`Candidate ${index + 1}`, `192.0.2.${index + 1}`, index),
  );
  const calls: string[] = [];
  const results = await probeRecommendedServers(candidates, {
    settings: { ...settings, retryCount: 0 },
    query: async (ip, port) => {
      calls.push(ip);
      return a2s(ip, port, true, 10);
    },
  });

  assert.equal(results.length, 6);
  assert.deepEqual(calls.sort(), candidates.slice(0, 6).map(candidate => candidate.ip).sort());
});

test('does not cache a probe result after its batch is cancelled', async () => {
  const candidate = server('Cancelled', '198.51.100.199', 5);
  const controller = new AbortController();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  const query = async (ip: string, port: string): Promise<A2SQueryResult> => {
    calls += 1;
    await gate;
    return a2s(ip, port, true, 20);
  };

  const cancelled = probeRecommendedServers([candidate], { query, settings, signal: controller.signal });
  controller.abort();
  release();
  await assert.rejects(cancelled, error => error instanceof DOMException && error.name === 'AbortError');

  await probeRecommendedServers([candidate], { query, settings });
  assert.equal(calls, 2);
});

function server(name: string, ip: string, players: number): RecommendedServer {
  return { name, ip, port: '27015', map: 'de_test', players, maxPlayers: 32, category: 'test', countryCode: 'US' };
}

function status(name: string, ip: string): ServerStatus {
  return { name, ip, port: '27015', players: 10, max_players: 32 } as ServerStatus;
}

function result(serverValue: RecommendedServer, success: boolean, latencyMs?: number): LocalLatencyResult {
  return { server: serverValue, success, latencyMs, error: success ? undefined : 'timeout' };
}

function a2s(ip: string, port: string, success: boolean, latencyMs?: number): A2SQueryResult {
  return {
    success, ip, port, latency_ms: latencyMs, error: success ? undefined : 'timeout', name: ip,
    map_name: 'de_test', game: 'Counter-Strike 2', players: 10, real_players: 10,
    max_players: 32, bots: 0, server_type: 'Dedicated', environment: 'Linux',
    password: false, vac: true, version: '1',
  };
}
