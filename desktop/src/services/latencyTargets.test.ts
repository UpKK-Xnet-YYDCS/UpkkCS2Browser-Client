import assert from 'node:assert/strict';
import test from 'node:test';
import { excludeForegroundTargets, getUniqueLatencyTargets, latencyTargetAddress } from './latencyTargets.ts';
import type { ServerStatus } from '../types/index.ts';

function server(overrides: Partial<ServerStatus> = {}): ServerStatus {
  return {
    name: 's',
    ip: '1.1.1.1',
    port: '27015',
    game: 'cs2',
    region: '',
    mode: '',
    players: 0,
    max_players: 0,
    bots: 0,
    real_players: 0,
    map_name: '',
    comments: '',
    display_address: '1.1.1.1',
    mapnamecn: '',
    category: '',
    priority: 0,
    config_order: 0,
    admin_sort_priority: 0,
    submitter_uid: 0,
    country_code: '',
    country_name: '',
    continent: '',
    geo_region: '',
    server_type: '',
    environment: '',
    vac: false,
    password: false,
    version: '',
    game_id: 0,
    last_updated: '',
    Online: true,
    ...overrides,
  } as ServerStatus;
}

test('getUniqueLatencyTargets de-duplicates addresses and keeps the lowest priority', () => {
  const targets = getUniqueLatencyTargets([
    server({ ip: '1.1.1.1', port: '27015', display_address: '1.1.1.1', Online: true }),
    server({ ip: '1.1.1.1', port: '27015', display_address: '1.1.1.1', Online: false }),
    server({ ip: '2.2.2.2', port: '27016', display_address: '2.2.2.2', Online: true }),
    server({ ip: '', port: '27015', display_address: '' }),
  ]);
  assert.equal(targets.length, 2);
  assert.equal(latencyTargetAddress(targets[0]), '1.1.1.1:27015');
  assert.equal(targets[0].priority, 0);
  assert.equal(targets[1].ip, '2.2.2.2');
});

test('excludeForegroundTargets removes visible addresses and keeps the original list when nothing is excluded', () => {
  const all = getUniqueLatencyTargets([
    server({ ip: '1.1.1.1', port: '27015', display_address: '1.1.1.1' }),
    server({ ip: '8.8.8.8', port: '27015', display_address: '8.8.8.8' }),
  ]);
  const remaining = excludeForegroundTargets(all, [
    server({ ip: '1.1.1.1', port: '27015', display_address: '1.1.1.1' }),
  ]);
  assert.deepEqual(remaining.map(latencyTargetAddress), ['8.8.8.8:27015']);
  const copied = excludeForegroundTargets(all, []);
  assert.equal(copied, all);
});
