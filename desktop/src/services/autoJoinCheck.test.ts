import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUTO_JOIN_A2S_TIMEOUT_MS,
  AUTO_JOIN_SUCCESS_CLOSE_MS,
  formatAutoJoinCountLog,
  formatAutoJoinDetectedStatus,
  formatAutoJoinSteamLog,
  formatAutoJoinUsingLog,
  formatAutoJoinWaitingStatus,
  openAutoJoinSteamUrl,
  queryAutoJoinCounts,
  shouldJoinFromCounts,
} from './autoJoinCheck.ts';

test('queryAutoJoinCounts prefers a successful A2S result and only then hits the API', async () => {
  const calls: string[] = [];
  const a2s = await queryAutoJoinCounts({
    ip: '1.1.1.1',
    port: '27015',
    isTauriAvailable: () => true,
    queryA2S: async (_ip, _port, options) => {
      calls.push('a2s:' + options.timeoutMs);
      return { success: true, real_players: 10, max_players: 64 };
    },
    refreshServer: async () => { calls.push('api'); return { success: true, server: { players: 99 } }; },
  });
  assert.deepEqual(a2s, { ok: true, source: 'a2s', counts: { realPlayers: 10, maxPlayers: 64 } });
  assert.deepEqual(calls, ['a2s:2500']);

  const api = await queryAutoJoinCounts({
    ip: '2.2.2.2',
    port: '27016',
    isTauriAvailable: () => true,
    queryA2S: async () => ({ success: false }),
    refreshServer: async (id) => ({ success: true, server: { real_players: 8, max_players: 32, id } }),
  });
  assert.deepEqual(api, { ok: true, source: 'api', counts: { realPlayers: 8, maxPlayers: 32 } });

  const skipped = await queryAutoJoinCounts({
    ip: '3.3.3.3',
    port: '27017',
    isTauriAvailable: () => false,
    queryA2S: async () => { throw new Error('should not query'); },
    refreshServer: async () => ({ success: false }),
  });
  assert.deepEqual(skipped, { ok: false });
});

test('auto-join copy and close delay stay on the existing format', () => {
  assert.equal(AUTO_JOIN_A2S_TIMEOUT_MS, 2_500);
  assert.equal(AUTO_JOIN_SUCCESS_CLOSE_MS, 2_000);
  assert.equal(formatAutoJoinCountLog('A2S', '1.1.1.1', '27015', { realPlayers: 12, maxPlayers: 64 }), 'A2S 1.1.1.1:27015 → 12/64');
  assert.equal(formatAutoJoinUsingLog('a2s', { realPlayers: 12, maxPlayers: 64 }), 'Using local A2S query: 12/64');
  assert.equal(formatAutoJoinUsingLog('api', { realPlayers: 8, maxPlayers: 32 }), 'Using API query: 8/32');
  assert.equal(formatAutoJoinDetectedStatus('检测到空位', 5, 4), '✅ 检测到空位 5 ≥ 4');
  assert.equal(formatAutoJoinWaitingStatus('等待中', 60, 64), '等待中 (60/64)');
  assert.equal(formatAutoJoinSteamLog('Box', 'steam://connect/1.1.1.1:27015'), 'Joining Box → steam://connect/1.1.1.1:27015');
  assert.deepEqual(shouldJoinFromCounts({ realPlayers: 60, maxPlayers: 64 }, 4), { availableSlots: 4, shouldJoin: true });
  assert.deepEqual(shouldJoinFromCounts({ realPlayers: 61, maxPlayers: 64 }, 4), { availableSlots: 3, shouldJoin: false });
});

test('openAutoJoinSteamUrl uses Tauri first and falls back to location.assign', async () => {
  const opened: string[] = [];
  const tauri = await openAutoJoinSteamUrl('steam://ok', {
    isTauriAvailable: () => true,
    openExternalUrl: async (url) => { opened.push('tauri:' + url); },
    assignLocation: (url) => { opened.push('loc:' + url); },
  });
  assert.deepEqual(tauri, {});
  assert.deepEqual(opened, ['tauri:steam://ok']);

  const preview = await openAutoJoinSteamUrl('steam://web', {
    isTauriAvailable: () => false,
    openExternalUrl: async () => { throw new Error('no'); },
    assignLocation: (url) => { opened.push('loc:' + url); },
  });
  assert.deepEqual(preview, {});
  assert.equal(opened.at(-1), 'loc:steam://web');

  const fallback = await openAutoJoinSteamUrl('steam://fail', {
    isTauriAvailable: () => true,
    openExternalUrl: async () => { throw new Error('boom'); },
    assignLocation: (url) => { opened.push('loc:' + url); },
  });
  assert.equal((fallback.fallbackError as Error).message, 'boom');
  assert.equal(opened.at(-1), 'loc:steam://fail');
});
