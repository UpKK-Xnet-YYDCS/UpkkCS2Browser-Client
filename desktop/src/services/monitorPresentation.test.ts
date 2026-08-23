import assert from 'node:assert/strict';
import test from 'node:test';
import { matchedServerToStatus } from './monitorPresentation.ts';

test('matchedServerToStatus parses a host:port key and keeps live fields', () => {
  const status = matchedServerToStatus({
    matchedRule: 'rule',
    matchedPattern: 'ze_*',
    serverKey: '8.8.8.8:27015',
    serverName: 'Box',
    mapName: 'ze_map',
    players: 12,
    maxPlayers: 64,
    matchedAt: 'now',
  });
  assert.equal(status.ip, '8.8.8.8');
  assert.equal(status.port, '27015');
  assert.equal(status.real_players, 12);
  assert.equal(status.online, true);
});

test('matchedServerToStatus keeps an unparsed key as the ip fallback', () => {
  const status = matchedServerToStatus({
    matchedRule: 'rule',
    matchedPattern: 'ze_*',
    serverKey: 'not-an-address',
    serverName: 'Box',
    mapName: 'ze_map',
    players: 1,
    maxPlayers: 10,
    matchedAt: 'now',
  });
  assert.equal(status.ip, 'not-an-address');
  assert.equal(status.port, '');
});


import { collectMonitoredServerKeys, formatMonitorClock } from './monitorPresentation.ts';

test('collectMonitoredServerKeys de-duplicates selected servers across rules', () => {
  assert.deepEqual(
    collectMonitoredServerKeys([
      { selectedServers: ['10.0.0.1:27015', '10.0.0.2:27015'] },
      { selectedServers: ['10.0.0.1:27015'] },
    ]),
    ['10.0.0.1:27015', '10.0.0.2:27015'],
  );
});

test('formatMonitorClock keeps the empty placeholder', () => {
  assert.equal(formatMonitorClock(null), '--');
});
