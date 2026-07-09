import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getLatencyGrade,
  getLatencyLabel,
  getServerLatencyTarget,
  applyLatencySnapshot,
  getLatencyFilterLabel,
  matchesLatencyFilter,
  LATENCY_FILTERS,
  type LatencyFilter,
} from './latencyDisplay.ts';
import type { ServerStatus } from '../types/server.ts';

function server(latencyMs?: number, status: ServerStatus['local_latency_status'] = 'success'): ServerStatus {
  return {
    name: 'Server',
    ip: '10.0.0.1',
    port: '27015',
    game: '',
    region: '',
    mode: '',
    players: 0,
    max_players: 64,
    bots: 0,
    real_players: 0,
    map_name: 'de_mirage',
    comments: '',
    display_address: '10.0.0.1',
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
    game_id: 730,
    last_updated: '',
    local_latency_status: status,
    local_latency_ms: latencyMs,
  };
}

test('formats local latency as xx ms without an A2S prefix', () => {
  assert.equal(getLatencyLabel({ status: 'success', latencyMs: 42 }), '42 ms');
  assert.equal(getLatencyLabel({ status: 'checking' }), '...');
  assert.equal(getLatencyLabel({ status: 'failed' }), '超时');
  assert.equal(getLatencyLabel({ status: 'unavailable' }), '--');
});

test('maps latency to green, yellow, amber, and red grades', () => {
  assert.equal(getLatencyGrade(80), 'green');
  assert.equal(getLatencyGrade(81), 'yellow');
  assert.equal(getLatencyGrade(150), 'yellow');
  assert.equal(getLatencyGrade(151), 'amber');
  assert.equal(getLatencyGrade(250), 'amber');
  assert.equal(getLatencyGrade(251), 'red');
});

test('filters servers by local latency threshold', () => {
  const filters: Array<[LatencyFilter, boolean[]]> = [
    ['all', [true, true, true, true, true, true, true]],
    ['le80', [true, false, false, false, false, false, false]],
    ['le150', [true, true, false, false, false, false, false]],
    ['le250', [true, true, true, false, false, false, false]],
    ['le300', [true, true, true, true, false, false, false]],
    ['le350', [true, true, true, true, true, false, false]],
    ['ge350', [false, false, false, false, true, true, false]],
    ['unknown', [false, false, false, false, false, false, true]],
  ];
  const servers = [
    server(60),
    server(120),
    server(220),
    server(280),
    server(350),
    server(360),
    server(undefined, 'failed'),
  ];

  for (const [filter, expected] of filters) {
    assert.deepEqual(servers.map(item => matchesLatencyFilter(item, filter)), expected);
  }
});

test('keeps pending or unmeasured servers visible while threshold latency filters are active', () => {
  const queued = server(undefined, 'queued');
  const checking = server(undefined, 'checking');
  const unmeasured = server(undefined, 'queued');
  delete unmeasured.local_latency_status;
  const failed = server(undefined, 'failed');
  const unavailable = server(undefined, 'unavailable');

  for (const filter of ['le80', 'le150', 'le250', 'le300', 'le350', 'ge350'] as LatencyFilter[]) {
    assert.equal(matchesLatencyFilter(queued, filter), true);
    assert.equal(matchesLatencyFilter(checking, filter), true);
    assert.equal(matchesLatencyFilter(unmeasured, filter), true);
    assert.equal(matchesLatencyFilter(failed, filter), false);
    assert.equal(matchesLatencyFilter(unavailable, filter), false);
  }
});

test('formats latency filter thresholds as compact pill labels', () => {
  assert.deepEqual(LATENCY_FILTERS, ['all', 'le80', 'le150', 'le250', 'le300', 'le350', 'ge350', 'unknown']);
  assert.equal(getLatencyFilterLabel('le80'), '≤80 ms');
  assert.equal(getLatencyFilterLabel('le150'), '≤150 ms');
  assert.equal(getLatencyFilterLabel('le250'), '≤250 ms');
  assert.equal(getLatencyFilterLabel('le300'), '≤300 ms');
  assert.equal(getLatencyFilterLabel('le350'), '≤350 ms');
  assert.equal(getLatencyFilterLabel('ge350'), '≥350 ms');
});

test('builds stable local latency targets and applies snapshots', () => {
  const source = server();
  source.display_address = 'example.com:27016';
  source.port = '27016';

  assert.deepEqual(getServerLatencyTarget(source), {
    key: 'example.com:27016',
    ip: 'example.com',
    port: '27016',
  });

  const updated = applyLatencySnapshot(source, {
    status: 'success',
    latencyMs: 72,
    updatedAt: 1_700_000_000_000,
  });

  assert.equal(updated.local_latency_status, 'success');
  assert.equal(updated.local_latency_ms, 72);
  assert.equal(updated.local_latency_updated_at, '2023-11-14T22:13:20.000Z');
  assert.equal(source.local_latency_ms, undefined);
});
