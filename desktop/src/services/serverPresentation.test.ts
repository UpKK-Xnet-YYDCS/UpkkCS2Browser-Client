import assert from 'node:assert/strict';
import test from 'node:test';
import type { ServerStatus } from '../types/server.ts';
import {
  getListedPlayerView,
  getPlayerLoadBand,
  getPlayerLoadGradient,
  getPlayerLoadPercent,
  getPlayerLoadTextClass,
  isListedPlayer,
  parseServerPlayersResult,
  resolveServerAddress,
  resolveServerPresentation,
} from './serverPresentation.ts';

function server(overrides: Partial<ServerStatus> = {}): ServerStatus {
  return {
    name: 'Primary',
    ip: '1.1.1.1',
    port: '27015',
    game: 'cs2',
    region: 'AS',
    mode: 'ze',
    players: 10,
    max_players: 64,
    bots: 2,
    real_players: 8,
    map_name: 'ze_map',
    comments: '',
    display_address: 'primary.example',
    mapnamecn: '',
    category: 'ze',
    priority: 0,
    config_order: 0,
    admin_sort_priority: 0,
    submitter_uid: 0,
    country_code: 'CN',
    country_name: 'China',
    continent: 'AS',
    geo_region: 'east_asia',
    server_type: 'd',
    environment: 'l',
    vac: true,
    password: false,
    version: '1',
    game_id: 730,
    last_updated: '',
    ...overrides,
  };
}

test('resolveServerAddress strips a duplicated port from display_address', () => {
  const resolved = resolveServerAddress(server({ display_address: '1.1.1.1:29667', port: '29667' }));
  assert.equal(resolved.baseAddress, '1.1.1.1');
  assert.equal(resolved.displayAddress, '1.1.1.1:29667');
});

test('resolveServerAddress keeps a domain and appends the port', () => {
  const resolved = resolveServerAddress(server());
  assert.equal(resolved.serverIp, '1.1.1.1');
  assert.equal(resolved.baseAddress, 'primary.example');
  assert.equal(resolved.displayAddress, 'primary.example:27015');
});

test('resolveServerAddress falls back to ip when display_address is empty', () => {
  const resolved = resolveServerAddress(server({ display_address: '', ip: '8.8.8.8', port: '' }));
  assert.equal(resolved.baseAddress, '8.8.8.8');
  assert.equal(resolved.displayAddress, '8.8.8.8');
});

test('resolveServerPresentation reads legacy PascalCase fields', () => {
  const view = resolveServerPresentation(server({
    name: '',
    ip: '',
    port: '',
    map_name: '',
    players: undefined as unknown as number,
    max_players: undefined as unknown as number,
    bots: undefined as unknown as number,
    country_name: '',
    country_code: '',
    vac: undefined as unknown as boolean,
    game: '',
    category: '',
    display_address: '',
    Name: 'Legacy',
    Addr: 'legacy.test',
    Port: 27016,
    Map: 'de_dust2',
    Players: 7,
    MaxPlayers: 16,
    Bots: 1,
    Country: 'Japan',
    CountryCode: 'JP',
    VAC: true,
    GameDesc: 'CS2',
    Category: 'dm',
  }));
  assert.equal(view.serverName, 'Legacy');
  assert.equal(view.serverIp, 'legacy.test');
  assert.equal(view.serverPort, 27016);
  assert.equal(view.displayAddress, 'legacy.test:27016');
  assert.equal(view.serverMap, 'de_dust2');
  assert.equal(view.serverPlayers, 7);
  assert.equal(view.serverMaxPlayers, 16);
  assert.equal(view.serverBots, 1);
  assert.equal(view.serverCountry, 'Japan');
  assert.equal(view.serverCountryCode, 'JP');
  assert.equal(view.serverVac, true);
  assert.equal(view.serverGame, 'CS2');
  assert.equal(view.serverCategory, 'dm');
});

test('getPlayerLoadPercent rounds and treats missing max as zero', () => {
  assert.equal(getPlayerLoadPercent(0, 0), 0);
  assert.equal(getPlayerLoadPercent(1, 3), 33);
  assert.equal(getPlayerLoadPercent(2, 3), 67);
});

test('parseServerPlayersResult accepts wrapped and raw arrays', () => {
  assert.deepEqual(parseServerPlayersResult(null), {});
  assert.deepEqual(parseServerPlayersResult({ is_authenticated: 1, players: [{ name: 'A' }] }), {
    isAuthenticated: true,
    players: [{ name: 'A' }],
  });
  assert.deepEqual(parseServerPlayersResult([{ Name: 'B' }]), {
    players: [{ Name: 'B' }],
  });
});

test('isListedPlayer hides empty and placeholder names', () => {
  assert.equal(isListedPlayer({}), false);
  assert.equal(isListedPlayer({ name: 'Unknown' }), false);
  assert.equal(isListedPlayer({ Name: '未知' }), false);
  assert.equal(isListedPlayer({ name: 'Alice' }), true);
});

test('getListedPlayerView prefers canonical fields and falls back to ?', () => {
  assert.deepEqual(getListedPlayerView({ Name: 'Bob', Score: 12, Duration: 90, DurationStr: '1m' }), {
    name: 'Bob',
    score: 12,
    durationSeconds: 90,
    durationLabel: '1m',
  });
  assert.deepEqual(getListedPlayerView({}), {
    name: '?',
    score: 0,
    durationSeconds: 0,
    durationLabel: undefined,
  });
});

test('player load band maps the existing card and list colors', () => {
  assert.equal(getPlayerLoadBand(80), 'high');
  assert.equal(getPlayerLoadBand(50), 'medium');
  assert.equal(getPlayerLoadBand(1), 'low');
  assert.equal(getPlayerLoadBand(0), 'empty');
  assert.equal(getPlayerLoadGradient(90), 'from-green-400 to-emerald-500');
  assert.equal(getPlayerLoadTextClass(0), 'text-gray-500 dark:text-gray-400');
});
