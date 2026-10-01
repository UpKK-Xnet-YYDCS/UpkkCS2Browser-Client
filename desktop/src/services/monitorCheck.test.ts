import assert from 'node:assert/strict';
import test from 'node:test';

import { performMonitorCheck } from './monitorCheck.ts';
import { resetMonitorMatchState } from './monitorMatchState.ts';
import type { MonitorServerInfo } from './monitorQuery.ts';
import type { MatchedServer, MonitorNotifySettings, MonitorRule } from './monitorTypes.ts';

function rule(overrides: Partial<MonitorRule> = {}): MonitorRule {
  return {
    id: 'rule-1',
    name: 'Dust',
    enabled: true,
    serverMode: 'selected',
    selectedServers: ['10.7.0.1:27015', '10.7.0.2:27015'],
    mapPatterns: ['de_dust2'],
    minPlayers: 1,
    notifyDesktop: true,
    notifyDiscord: false,
    discordWebhookUrl: '',
    notifyServerChan: false,
    serverChanKey: '',
    cooldownSeconds: 0,
    requiredMatches: 1,
    autoJoin: true,
    createdAt: '2026-09-22T00:00:00.000Z',
    ...overrides,
  };
}

function settings(): MonitorNotifySettings {
  return {
    notifyDesktop: true,
    notifyDiscord: true,
    discordWebhookUrl: 'https://example.invalid/discord',
    notifyServerChan: false,
    serverChanKey: '',
    notifyCustomWebhook: false,
    customWebhookUrl: '',
    customMessageTemplate: '',
    alertTitle: '',
  };
}

function online(key: string, name: string): MonitorServerInfo {
  return {
    key,
    name,
    mapName: 'de_dust2',
    players: 8,
    maxPlayers: 16,
    isOnline: true,
    gameName: 'Counter-Strike 2',
  };
}

test('monitor check joins before notifying and sends matches in scan order', async () => {
  resetMonitorMatchState();
  const order: string[] = [];
  const notified: string[][] = [];

  const result = await performMonitorCheck([rule()], {
    queryServers: async () => {
      order.push('query');
      return [online('10.7.0.1:27015', 'Alpha'), online('10.7.0.2:27015', 'Beta')];
    },
    openJoinUrl: async (url) => {
      order.push(`join:${url}`);
    },
    loadSettings: settings,
    notify: async (entries: readonly MatchedServer[]) => {
      order.push('notify');
      notified.push(entries.map(entry => entry.serverKey));
    },
  });

  assert.equal(notified.length, 1);
  assert.deepEqual(notified[0], ['10.7.0.1:27015', '10.7.0.2:27015']);
  assert.equal(order[0], 'query');
  assert.equal(order.at(-1), 'notify');
  assert.equal(order.some(step => step.startsWith('join:')), true);
  assert.ok(order.indexOf('notify') > order.findIndex(step => step.startsWith('join:')));
  assert.equal(result.autoJoined?.serverKey, '10.7.0.1:27015');
  assert.equal(result.servers.length, 2);
  resetMonitorMatchState();
});

test('a check cancelled while querying neither joins, notifies nor counts the observation', async () => {
  resetMonitorMatchState();
  const joins: string[] = [];
  const notified: string[][] = [];
  const rules = [rule({ selectedServers: ['10.7.0.1:27015'], requiredMatches: 2 })];
  const dependencies = {
    queryServers: async () => [online('10.7.0.1:27015', 'Alpha')],
    openJoinUrl: async (url: string) => { joins.push(url); },
    loadSettings: settings,
    notify: async (entries: readonly MatchedServer[]) => {
      notified.push(entries.map(entry => entry.serverKey));
    },
  };

  // Seen once before, so the next counted observation would satisfy requiredMatches: 2.
  assert.equal((await performMonitorCheck(rules, dependencies)).autoJoined, null);

  let cancelled = false;
  let release: (servers: MonitorServerInfo[]) => void = () => undefined;
  const queried = new Promise<MonitorServerInfo[]>(resolve => { release = resolve; });
  const stale = performMonitorCheck(rules, {
    ...dependencies,
    queryServers: () => queried,
    isCancelled: () => cancelled,
  });
  cancelled = true; // Stop / restart while the query is still in flight.
  release([online('10.7.0.1:27015', 'Alpha')]);
  const staleResult = await stale;

  assert.equal(staleResult.autoJoined, null);
  assert.deepEqual(staleResult.matched, []);
  assert.deepEqual(joins, []);
  assert.deepEqual(notified, []);

  // The cancelled check left the consecutive counter and cooldowns untouched.
  const next = await performMonitorCheck(rules, dependencies);
  assert.equal(next.autoJoined?.serverKey, '10.7.0.1:27015');
  assert.equal(joins.length, 1);
  assert.deepEqual(notified, [['10.7.0.1:27015']]);
  resetMonitorMatchState();
});

test('cancelling during the auto-join suppresses the notifications of that check', async () => {
  resetMonitorMatchState();
  const joins: string[] = [];
  const notified: string[][] = [];
  let cancelled = false;

  const result = await performMonitorCheck([rule()], {
    queryServers: async () => [online('10.7.0.1:27015', 'Alpha'), online('10.7.0.2:27015', 'Beta')],
    openJoinUrl: async (url) => {
      joins.push(url);
      cancelled = true;
    },
    loadSettings: settings,
    notify: async (entries: readonly MatchedServer[]) => {
      notified.push(entries.map(entry => entry.serverKey));
    },
    isCancelled: () => cancelled,
  });

  assert.equal(joins.length, 1);
  assert.equal(result.autoJoined?.serverKey, '10.7.0.1:27015');
  assert.deepEqual(notified, []);
  resetMonitorMatchState();
});

test('a check that is never cancelled keeps the existing join and notification flow', async () => {
  resetMonitorMatchState();
  const order: string[] = [];
  const result = await performMonitorCheck([rule()], {
    queryServers: async () => [online('10.7.0.1:27015', 'Alpha'), online('10.7.0.2:27015', 'Beta')],
    openJoinUrl: async () => { order.push('join'); },
    loadSettings: settings,
    notify: async (entries: readonly MatchedServer[]) => {
      order.push(`notify:${entries.map(entry => entry.serverKey).join(',')}`);
    },
    isCancelled: () => false,
  });
  assert.deepEqual(order, ['join', 'notify:10.7.0.1:27015,10.7.0.2:27015']);
  assert.equal(result.matched.length, 2);
  resetMonitorMatchState();
});
