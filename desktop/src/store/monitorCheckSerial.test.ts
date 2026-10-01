import assert from 'node:assert/strict';
import test from 'node:test';
import { createMonitorCheckSerial } from './monitorCheckSerial.ts';
import { performMonitorCheck } from '../services/monitorCheck.ts';
import { resetMonitorMatchState } from '../services/monitorMatchState.ts';
import type { MonitorServerInfo } from '../services/monitorQuery.ts';
import type { MatchedServer, MonitorNotifySettings, MonitorRule } from '../services/monitorTypes.ts';

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test('a new generation waits for the in-flight check, which becomes stale', async () => {
  const serial = createMonitorCheckSerial();
  const steps: string[] = [];
  const first = deferred();
  let firstIsStale: () => boolean = () => false;

  const oldRun = serial.run(serial.nextGeneration(), async (isStale) => {
    firstIsStale = isStale;
    steps.push('old:start');
    await first.promise;
    steps.push(`old:end stale=${isStale()}`);
  });
  await Promise.resolve();
  assert.equal(firstIsStale(), false);

  serial.nextGeneration(); // stop
  const newRun = serial.run(serial.nextGeneration(), async (isStale) => {
    steps.push(`new:start stale=${isStale()}`);
  });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(steps, ['old:start']);

  first.resolve();
  await Promise.all([oldRun, newRun]);
  assert.deepEqual(steps, ['old:start', 'old:end stale=true', 'new:start stale=false']);
});

test('checks queued for a generation that went stale are skipped', async () => {
  const serial = createMonitorCheckSerial();
  const gate = deferred();
  const ran: string[] = [];
  const running = serial.run(serial.nextGeneration(), async () => { await gate.promise; ran.push('a'); });
  await new Promise(resolve => setTimeout(resolve, 0)); // "a" is in flight
  const queued = serial.run(serial.nextGeneration(), async () => { ran.push('b'); });
  serial.nextGeneration(); // stopped before "b" could start
  gate.resolve();
  await Promise.all([running, queued]);
  assert.deepEqual(ran, ['a']);
});

test('a rejected check reaches its caller without blocking the next one', async () => {
  const serial = createMonitorCheckSerial();
  const generation = serial.nextGeneration();
  await assert.rejects(serial.run(generation, async () => { throw new Error('chunk load failed'); }));
  let ran = false;
  await serial.run(generation, async () => { ran = true; });
  assert.equal(ran, true);
});

function rule(): MonitorRule {
  return {
    id: 'rule-1',
    name: 'Dust',
    enabled: true,
    serverMode: 'selected',
    selectedServers: ['10.7.0.1:27015'],
    mapPatterns: ['de_dust2'],
    minPlayers: 1,
    notifyDesktop: true,
    notifyDiscord: false,
    discordWebhookUrl: '',
    notifyServerChan: false,
    serverChanKey: '',
    cooldownSeconds: 0,
    requiredMatches: 2,
    autoJoin: true,
    createdAt: '2026-09-22T00:00:00.000Z',
  };
}

function settings(): MonitorNotifySettings {
  return {
    notifyDesktop: true,
    notifyDiscord: false,
    discordWebhookUrl: '',
    notifyServerChan: false,
    serverChanKey: '',
    notifyCustomWebhook: false,
    customWebhookUrl: '',
    customMessageTemplate: '',
    alertTitle: '',
  };
}

const alpha: MonitorServerInfo = {
  key: '10.7.0.1:27015',
  name: 'Alpha',
  mapName: 'de_dust2',
  players: 8,
  maxPlayers: 16,
  isOnline: true,
  gameName: 'Counter-Strike 2',
};

test('restarting during a slow check does not satisfy requiredMatches: 2 with one observation', async () => {
  resetMonitorMatchState();
  const serial = createMonitorCheckSerial();
  const joins: string[] = [];
  const notified: MatchedServer[][] = [];
  const slowQuery = deferred();
  let queries = 0;
  const check = (isStale: () => boolean) => performMonitorCheck([rule()], {
    queryServers: async () => {
      queries += 1;
      if (queries === 1) await slowQuery.promise;
      return [alpha];
    },
    openJoinUrl: async (url) => { joins.push(url); },
    loadSettings: settings,
    notify: async (entries) => { notified.push([...entries]); },
    isCancelled: isStale,
  }).then(() => undefined);

  const oldRun = serial.run(serial.nextGeneration(), check);
  await new Promise(resolve => setTimeout(resolve, 0));
  serial.nextGeneration(); // restart: off ...
  const newRun = serial.run(serial.nextGeneration(), check); // ... then on
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(queries, 1, 'the restarted run waits for the in-flight check');

  slowQuery.resolve();
  await Promise.all([oldRun, newRun]);
  assert.equal(queries, 2);
  assert.deepEqual(joins, [], 'one real observation must not auto-join');
  assert.deepEqual(notified, []);

  await serial.run(serial.nextGeneration(), check);
  assert.equal(joins.length, 1, 'the second counted observation joins once');
  assert.equal(notified.length, 1);
  resetMonitorMatchState();
});
