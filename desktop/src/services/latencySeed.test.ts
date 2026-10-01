import assert from 'node:assert/strict';
import test from 'node:test';

import { freshSuccessLatencySeeds } from './latencySeed.ts';
import type { ServerStatus } from '@/types';

function server(overrides: Partial<ServerStatus>): ServerStatus {
  return {
    name: 'Seed',
    ip: '10.4.0.1',
    port: '27015',
    game: '',
    region: '',
    mode: '',
    players: 0,
    max_players: 0,
    bots: 0,
    real_players: 0,
    map_name: '',
    comments: '',
    display_address: '10.4.0.1',
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
  };
}

test('fresh success latency seeds skip missing, failed, and expired samples', () => {
  const now = Date.parse('2026-09-22T00:00:30.000Z');
  const seeds = freshSuccessLatencySeeds([
    server({
      local_latency_status: 'success',
      local_latency_ms: 18.2,
      local_latency_updated_at: '2026-09-22T00:00:00.000Z',
    }),
    server({
      ip: '10.4.0.2',
      display_address: '10.4.0.2',
      local_latency_status: 'failed',
      local_latency_updated_at: '2026-09-22T00:00:00.000Z',
    }),
    server({
      ip: '10.4.0.3',
      display_address: '10.4.0.3',
      local_latency_status: 'success',
      local_latency_ms: 40,
      local_latency_updated_at: '2026-09-21T00:00:00.000Z',
    }),
  ], now, 60_000);

  assert.deepEqual(seeds, [{
    address: '10.4.0.1:27015',
    snapshot: {
      status: 'success',
      latencyMs: 18,
      updatedAt: Date.parse('2026-09-22T00:00:00.000Z'),
    },
  }]);
});
