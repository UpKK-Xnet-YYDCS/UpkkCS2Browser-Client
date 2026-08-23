import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectFavoriteGameNames,
  favoriteExportFilename,
  filterFavoriteServersByGame,
  filterFavoriteServersByOnline,
  filterFavoriteServersBySearch,
  offlineFavoriteAddresses,
  parseImportedFavoriteAddresses,
  serializeFavoriteExport,
  truncateFavoriteGameLabel,
} from './homeFavoriteFilters.ts';
import type { ServerStatus } from '../types/server.ts';

function server(overrides: Partial<ServerStatus> = {}): ServerStatus {
  return {
    name: 'Alpha',
    ip: '1.1.1.1',
    port: '27015',
    game: 'cs2',
    map_name: 'ze_map',
    online: true,
    is_online: true,
    ...overrides,
  } as ServerStatus;
}

test('collectFavoriteGameNames sorts by count and ignores empty names', () => {
  const names = collectFavoriteGameNames([
    server({ game: 'cs2' }),
    server({ game: ' cs2 ' }),
    server({ game: 'csgo' }),
    server({ game: '  ' }),
  ]);
  assert.deepEqual(names, [{ name: 'cs2', count: 2 }, { name: 'csgo', count: 1 }]);
});

test('favorite filters compose online, game, and search stages', () => {
  const servers = [
    server({ name: 'ZE Box', game: 'cs2', map_name: 'ze_a', online: true }),
    server({ name: 'Old', ip: '2.2.2.2', game: 'csgo', online: false, is_online: false, server_offline: true }),
  ];
  assert.equal(filterFavoriteServersByOnline(servers, false).length, 1);
  assert.equal(filterFavoriteServersByGame(servers, 'csgo')[0].name, 'Old');
  assert.equal(filterFavoriteServersBySearch(servers, 'ze_a')[0].name, 'ZE Box');
  assert.equal(filterFavoriteServersBySearch(servers, '2.2.2.2').length, 1);
});

test('parseImportedFavoriteAddresses accepts wrapped and raw arrays', () => {
  assert.deepEqual(
    parseImportedFavoriteAddresses(JSON.stringify({ favorites: ['8.8.8.8:27015', 'bad', 12] })),
    ['8.8.8.8:27015'],
  );
  assert.deepEqual(parseImportedFavoriteAddresses(JSON.stringify(['9.9.9.9:27015'])), ['9.9.9.9:27015']);
  assert.deepEqual(parseImportedFavoriteAddresses(JSON.stringify({ nope: true })), []);
});

test('offline addresses and export payload keep the existing format', () => {
  const now = new Date('2026-08-14T01:02:03.000Z');
  assert.deepEqual(
    offlineFavoriteAddresses([server({ online: false, is_online: false, server_offline: true })]),
    ['1.1.1.1:27015'],
  );
  assert.equal(favoriteExportFilename(now), 'xproj_favorites_2026-08-14.json');
  assert.equal(
    serializeFavoriteExport(['1.1.1.1:27015'], now),
    JSON.stringify({ favorites: ['1.1.1.1:27015'], exportedAt: now.toISOString() }, null, 2),
  );
});

test('truncateFavoriteGameLabel cuts on a UTF-8 byte boundary', () => {
  assert.equal(truncateFavoriteGameLabel('short'), 'short');
  assert.equal(truncateFavoriteGameLabel('a'.repeat(32)), 'a'.repeat(32));
  assert.equal(truncateFavoriteGameLabel('a'.repeat(33)), 'a'.repeat(32) + '…');
  assert.equal(truncateFavoriteGameLabel('测'.repeat(20)).endsWith('…'), true);
  assert.ok(new TextEncoder().encode(truncateFavoriteGameLabel('测'.repeat(20)).slice(0, -1)).length <= 32);
});
