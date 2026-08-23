import assert from 'node:assert/strict';
import test from 'node:test';
import type { A2SQueryResult } from './a2sQuery.ts';
import {
  makeOfflinePlaceholder,
  mapA2SFailurePatch,
  mapA2SSuccessToServerStatus,
  queryFavoriteServerWithRetry,
  replaceFavoriteServerInPlace,
} from './homeFavoriteA2S.ts';

const now = '2026-08-14T00:00:00.000Z';
const parsed = { ip: '1.1.1.1', port: '27015' };

function a2sResult(overrides: Partial<A2SQueryResult> = {}): A2SQueryResult {
  return {
    success: true,
    ip: parsed.ip,
    port: parsed.port,
    name: 'Alpha',
    map_name: 'de_dust2',
    game: 'cs2',
    players: 8,
    max_players: 16,
    bots: 1,
    real_players: 7,
    server_type: 'd',
    environment: 'l',
    password: false,
    vac: true,
    version: '1.0',
    latency_ms: 42.6,
    ...overrides,
  };
}

test('makeOfflinePlaceholder keeps the offline queue fields', () => {
  const placeholder = makeOfflinePlaceholder(parsed.ip, parsed.port, {
    now,
    latencyStatus: 'queued',
  });
  assert.equal(placeholder.ip, parsed.ip);
  assert.equal(placeholder.port, parsed.port);
  assert.equal(placeholder.display_address, parsed.ip);
  assert.equal(placeholder.Online, false);
  assert.equal(placeholder.local_latency_status, 'queued');
  assert.equal(placeholder.last_updated, now);
  assert.equal(placeholder.name, '');
});

test('mapA2SSuccessToServerStatus maps latency and preserves the query address', () => {
  const server = mapA2SSuccessToServerStatus(a2sResult(), parsed, now);
  assert.equal(server.ip, parsed.ip);
  assert.equal(server.port, parsed.port);
  assert.equal(server.display_address, parsed.ip);
  assert.equal(server.Online, true);
  assert.equal(server.local_latency_status, 'success');
  assert.equal(server.local_latency_ms, 43);
  assert.equal(server.local_latency_error, undefined);
  assert.equal(server.local_latency_updated_at, now);
  assert.equal(server.vac, true);
});

test('mapA2SSuccessToServerStatus marks missing latency as failed', () => {
  const server = mapA2SSuccessToServerStatus(a2sResult({ latency_ms: undefined }), parsed, now);
  assert.equal(server.local_latency_status, 'failed');
  assert.equal(server.local_latency_ms, undefined);
  assert.equal(server.local_latency_error, 'A2S latency unavailable');
});

test('mapA2SFailurePatch keeps the failed latency fields', () => {
  assert.deepEqual(mapA2SFailurePatch('A2S query failed', now), {
    local_latency_status: 'failed',
    local_latency_error: 'A2S query failed',
    local_latency_updated_at: now,
  });
});

test('replaceFavoriteServerInPlace updates only the matching address and keeps order', () => {
  const first = makeOfflinePlaceholder('1.1.1.1', '27015', { now, latencyStatus: 'queued' });
  const second = makeOfflinePlaceholder('2.2.2.2', '27015', { now, latencyStatus: 'queued' });
  const mapped = mapA2SSuccessToServerStatus(a2sResult(), parsed, now);
  const next = replaceFavoriteServerInPlace([first, second], parsed, mapped);
  assert.equal(next[0], mapped);
  assert.equal(next[1], second);
  assert.deepEqual(next.map(server => `${server.ip}:${server.port}`), ['1.1.1.1:27015', '2.2.2.2:27015']);
});

test('queryFavoriteServerWithRetry returns the first success without sleeping', async () => {
  const calls: string[] = [];
  const result = await queryFavoriteServerWithRetry(parsed, {
    timeoutMs: 50,
    retryCount: 2,
    retryDelayMs: 10,
    query: async () => {
      calls.push('query');
      return a2sResult();
    },
    sleep: async () => {
      calls.push('sleep');
    },
  });
  assert.equal(result?.success, true);
  assert.deepEqual(calls, ['query']);
});

test('queryFavoriteServerWithRetry retries unsuccessful results then succeeds', async () => {
  const calls: string[] = [];
  let attempt = 0;
  const result = await queryFavoriteServerWithRetry(parsed, {
    timeoutMs: 50,
    retryCount: 2,
    retryDelayMs: 5,
    query: async () => {
      attempt += 1;
      calls.push(`query-${attempt}`);
      if (attempt < 2) return a2sResult({ success: false, error: 'busy' });
      return a2sResult();
    },
    sleep: async () => {
      calls.push('sleep');
    },
  });
  assert.equal(result?.success, true);
  assert.deepEqual(calls, ['query-1', 'sleep', 'query-2']);
});

test('queryFavoriteServerWithRetry keeps the last failed result after retries', async () => {
  const result = await queryFavoriteServerWithRetry(parsed, {
    timeoutMs: 20,
    retryCount: 1,
    retryDelayMs: 0,
    query: async () => {
      throw new Error('timeout');
    },
    sleep: async () => {
      throw new Error('should not sleep when retryDelayMs is 0');
    },
  });
  assert.equal(result?.success, false);
  assert.equal(result?.error, 'timeout');
  assert.equal(result?.ip, parsed.ip);
  assert.equal(result?.port, parsed.port);
});
