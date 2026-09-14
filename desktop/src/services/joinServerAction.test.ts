import assert from 'node:assert/strict';
import test from 'node:test';
import type { ServerStatus } from '@/types';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, String(value));
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => memory.clear(),
    key: () => null,
    length: 0,
  },
});

const { requestJoinServer } = await import('./joinServerAction.ts');

const server = {
  ip: '203.0.113.50',
  port: '27015',
  name: 'Test',
  game: 'Counter-Strike 2',
  game_id: 730,
} as ServerStatus;

test('join button opens Steam immediately when skip confirmation is on', async () => {
  const opened: string[] = [];
  const confirmed: ServerStatus[] = [];
  const result = await requestJoinServer(server, target => confirmed.push(target), {
    skipConfirm: true,
    opener: async url => { opened.push(url); },
  });
  assert.equal(result, 'joined');
  assert.equal(opened.length, 1);
  assert.match(opened[0], /203\.0\.113\.50:27015$/);
  assert.equal(confirmed.length, 0);
});

test('join button opens the confirm dialog when skip confirmation is off', async () => {
  const opened: string[] = [];
  const confirmed: ServerStatus[] = [];
  const result = await requestJoinServer(server, target => confirmed.push(target), {
    skipConfirm: false,
    opener: async url => { opened.push(url); },
  });
  assert.equal(result, 'confirm');
  assert.equal(opened.length, 0);
  assert.equal(confirmed.length, 1);
  assert.equal(confirmed[0], server);
});
