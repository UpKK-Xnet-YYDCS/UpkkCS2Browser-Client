import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearableOfflineFavoriteAddresses,
  isFavoriteQueryPending,
  remainingAfterClearingOffline,
} from './homeFavoriteClearOffline.ts';
import {
  makeOfflinePlaceholder,
  mapA2SFailurePatch,
} from '../services/homeFavoriteA2S.ts';
import type { ServerStatus } from '../types/index.ts';

const now = '2026-09-27T00:00:00.000Z';

function placeholder(ip: string, latencyStatus: NonNullable<ServerStatus['local_latency_status']>): ServerStatus {
  return makeOfflinePlaceholder(ip, '27015', { now, latencyStatus });
}

function failed(ip: string): ServerStatus {
  return { ...placeholder(ip, 'checking'), ...mapA2SFailurePatch('timeout', now) };
}

function online(ip: string): ServerStatus {
  return { ...placeholder(ip, 'checking'), name: ip, Online: true, local_latency_status: 'success' };
}

test('placeholders still queued or being queried are pending', () => {
  assert.equal(isFavoriteQueryPending(placeholder('10.0.0.1', 'queued')), true);
  assert.equal(isFavoriteQueryPending(placeholder('10.0.0.1', 'checking')), true);
  assert.equal(isFavoriteQueryPending(failed('10.0.0.1')), false);
  assert.equal(isFavoriteQueryPending(online('10.0.0.1')), false);
});

test('clear offline removes settled offline favorites only, in list order', () => {
  const servers = [
    failed('10.0.0.1'),
    placeholder('10.0.0.2', 'queued'),
    online('10.0.0.3'),
    placeholder('10.0.0.4', 'checking'),
    failed('10.0.0.5'),
  ];
  assert.deepEqual(clearableOfflineFavoriteAddresses(servers), ['10.0.0.1:27015', '10.0.0.5:27015']);
  assert.deepEqual(
    remainingAfterClearingOffline(servers).map(server => server.ip),
    ['10.0.0.2', '10.0.0.3', '10.0.0.4'],
  );
});

test('a reload that has not reported back clears nothing', () => {
  const reloading = [placeholder('10.0.0.1', 'queued'), placeholder('10.0.0.2', 'checking')];
  assert.deepEqual(clearableOfflineFavoriteAddresses(reloading), []);
  assert.deepEqual(remainingAfterClearingOffline(reloading), reloading);
});

test('settled results keep the previous clear-offline behaviour', () => {
  const settled = [failed('10.0.0.1'), online('10.0.0.2'), placeholder('10.0.0.3', 'unavailable')];
  assert.deepEqual(clearableOfflineFavoriteAddresses(settled), ['10.0.0.1:27015', '10.0.0.3:27015']);
  assert.deepEqual(remainingAfterClearingOffline(settled).map(server => server.ip), ['10.0.0.2']);
});
