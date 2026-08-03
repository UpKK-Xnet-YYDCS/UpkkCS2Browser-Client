import assert from 'node:assert/strict';
import test from 'node:test';
import type { A2SQueryResult, A2SQueryTarget } from './a2s.ts';
import { compileMapPattern, matchMapPattern, queryMonitorServers } from './monitorQuery.ts';

function result(target: A2SQueryTarget, index: number): A2SQueryResult {
  return {
    success: true,
    ip: target.ip,
    port: target.port,
    name: `Server ${index}`,
    map_name: `map_${index}`,
    game: 'cs2',
    players: index + 2,
    max_players: 20,
    bots: 1,
    real_players: index + 1,
    server_type: 'dedicated',
    environment: 'Linux',
    password: false,
    vac: true,
    version: '1',
  };
}

test('batch monitor queries de-duplicate addresses and preserve first-seen order', async () => {
  let receivedTargets: A2SQueryTarget[] = [];
  let receivedConcurrency: number | undefined;
  const servers = await queryMonitorServers([
    'one.example.com:27015',
    'two.example.com:27016',
    'one.example.com:27015',
    'invalid',
  ], async (targets, options) => {
    receivedTargets = targets;
    receivedConcurrency = options?.concurrency;
    return targets.map(result);
  });

  assert.deepEqual(receivedTargets.map(target => `${target.ip}:${target.port}`), [
    'one.example.com:27015',
    'two.example.com:27016',
  ]);
  assert.equal(receivedConcurrency, 3);
  assert.deepEqual(servers.map(server => server.key), [
    'one.example.com:27015',
    'two.example.com:27016',
  ]);
  assert.deepEqual(servers.map(server => server.players), [1, 2]);
});

test('batch monitor queries retain offline placeholders at their original positions', async () => {
  const servers = await queryMonitorServers([
    'one.example.com:27015',
    'two.example.com:27016',
  ], async targets => [
    result(targets[0], 0),
    { ...result(targets[1], 1), success: false, error: 'timeout' },
  ]);

  assert.equal(servers[0].isOnline, true);
  assert.equal(servers[1].isOnline, false);
  assert.equal(servers[1].key, 'two.example.com:27016');
});

test('compiled map patterns keep wildcard and case-insensitive matching semantics', () => {
  const cases: Array<[string, string, boolean]> = [
    ['ze_jurassic', 'ze_*', true],
    ['DE_DUST2', 'de_dust2', true],
    ['de_nuke', '*', true],
    ['', '*', false],
    ['de_nuke', 'ze_*', false],
  ];
  for (const [mapName, pattern, expected] of cases) {
    assert.equal(compileMapPattern(pattern)(mapName), expected);
    assert.equal(matchMapPattern(mapName, pattern), expected);
  }
});
