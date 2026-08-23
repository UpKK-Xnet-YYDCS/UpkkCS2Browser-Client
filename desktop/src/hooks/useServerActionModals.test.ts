import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAlternateAutoJoinTarget, buildAlternateJoinTarget } from './useServerActionModals.ts';
import type { ServerStatus } from '../types/index.ts';

function baseServer(overrides: Partial<ServerStatus> = {}): ServerStatus {
  return {
    name: 'Primary',
    ip: '1.1.1.1',
    port: '27015',
    game: 'cs2',
    region: 'AS',
    mode: 'ze',
    players: 10,
    max_players: 64,
    bots: 0,
    real_players: 10,
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
    ...overrides,
  } as ServerStatus;
}

test('buildAlternateJoinTarget copies alternate player and country fields', () => {
  const server = baseServer();
  const next = buildAlternateJoinTarget(server, '8.8.8.8', "27016", {
    real_players: 22,
    max_players: 32,
    country_code: 'JP',
    country_name: 'Japan',
  });
  assert.equal(next.ip, '8.8.8.8');
  assert.equal(next.port, '27016');
  assert.equal(next.display_address, '8.8.8.8');
  assert.equal(next.players, 22);
  assert.equal(next.real_players, 22);
  assert.equal(next.max_players, 32);
  assert.equal(next.country_code, 'JP');
  assert.equal(next.country_name, 'Japan');
  assert.equal(next.name, 'Primary');
});

test('buildAlternateJoinTarget keeps primary fields when alternate is missing', () => {
  const server = baseServer({ players: 7, real_players: 7, max_players: 16 });
  const next = buildAlternateJoinTarget(server, '9.9.9.9', '27017');
  assert.equal(next.players, 7);
  assert.equal(next.real_players, 7);
  assert.equal(next.max_players, 16);
  assert.equal(next.country_code, 'CN');
  assert.equal(next.port, '27017');
});

test('buildAlternateAutoJoinTarget only remaps address fields', () => {
  const server = baseServer();
  const next = buildAlternateAutoJoinTarget(server, '2.2.2.2', '27018');
  assert.equal(next.ip, '2.2.2.2');
  assert.equal(next.port, '27018');
  assert.equal(next.display_address, '2.2.2.2');
  assert.equal(next.players, server.players);
  assert.equal(next.country_code, server.country_code);
});
