import assert from 'node:assert/strict';
import test from 'node:test';
import { appReducer, type AppState } from './appState.ts';
import type { ServerStatus } from '../types/server.ts';

function server(name: string, ip = '127.0.0.1'): ServerStatus {
  return {
    name, ip, port: '27015', game: 'cs2', region: '', mode: '', players: 1,
    max_players: 20, bots: 0, real_players: 1, map_name: 'de_dust2', comments: '',
    display_address: ip, mapnamecn: '', category: '', priority: 0, config_order: 0,
    admin_sort_priority: 0, submitter_uid: 0, country_code: '', country_name: '',
    continent: '', geo_region: '', server_type: '', environment: '', vac: false,
    password: false, version: '', game_id: 0, last_updated: '',
  };
}

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    servers: [],
    totalServers: 0,
    currentPage: 1,
    totalPages: 0,
    isLoading: false,
    error: null,
    categories: [],
    selectedCategory: null,
    searchQuery: '',
    selectedRegion: 'all',
    selectedGameType: 'cs2',
    selectedContinent: 'all',
    selectedGeoRegion: 'all',
    selectedCountry: 'all',
    stats: null,
    apiBaseUrl: 'https://servers.upkk.com',
    favorites: [],
    viewMode: 'card',
    perPage: 20,
    cardMinWidth: 320,
    metadataCountries: [],
    metadataMaps: [],
    ...overrides,
  };
}

test('identical loading, error, stats, and metadata updates keep the previous state', () => {
  const current = state({
    isLoading: true,
    error: 'x',
    stats: { total_servers: 1, online_servers: 1, total_players: 2, total_max_players: 10 },
    categories: ['ze'],
    metadataCountries: [{ code: 'CN', name: 'China', count: 3 }],
    metadataMaps: ['de_dust2'],
  });
  assert.equal(appReducer(current, { type: 'SET_LOADING', payload: true }), current);
  assert.equal(appReducer(current, { type: 'SET_ERROR', payload: 'x' }), current);
  assert.equal(appReducer(current, {
    type: 'SET_STATS',
    payload: { total_servers: 1, online_servers: 1, total_players: 2, total_max_players: 10 },
  }), current);
  assert.equal(appReducer(current, { type: 'SET_CATEGORIES', payload: ['ze'] }), current);
  assert.equal(appReducer(current, {
    type: 'SET_METADATA',
    payload: { countries: [{ code: 'CN', name: 'China', count: 3 }], maps: ['de_dust2'] },
  }), current);
});

test('identical server page payloads keep the previous entity array and state object', () => {
  const first = server('One');
  const current = state({
    servers: [first],
    totalServers: 1,
    currentPage: 2,
    totalPages: 4,
  });
  const next = appReducer(current, {
    type: 'SET_SERVERS',
    payload: { servers: [{ ...first }], total: 1, page: 2, totalPages: 4 },
  });
  assert.equal(next, current);
  assert.equal(next.servers, current.servers);
  assert.equal(next.servers[0], first);
});

test('empty pages and reorder keep exact totals and reuse unchanged entities', () => {
  const first = server('One', '10.0.0.1');
  const second = server('Two', '10.0.0.2');
  const current = state({
    servers: [first, second],
    totalServers: 2,
    currentPage: 1,
    totalPages: 1,
  });

  const reordered = appReducer(current, {
    type: 'SET_SERVERS',
    payload: { servers: [{ ...second }, { ...first }], total: 2, page: 1, totalPages: 1 },
  });
  assert.equal(reordered.servers[0], second);
  assert.equal(reordered.servers[1], first);
  assert.equal(reordered.totalServers, 2);
  assert.notEqual(reordered.servers, current.servers);

  const emptied = appReducer(reordered, {
    type: 'SET_SERVERS',
    payload: { servers: [], total: 0, page: 1, totalPages: 0 },
  });
  assert.deepEqual(emptied.servers, []);
  assert.equal(emptied.totalServers, 0);
  assert.equal(emptied.totalPages, 0);
  assert.equal(emptied.currentPage, 1);
});
