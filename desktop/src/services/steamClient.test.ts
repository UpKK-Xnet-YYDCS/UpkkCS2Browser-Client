import test from 'node:test';
import assert from 'node:assert/strict';
import { openServerOnce } from './steamClient.ts';
import type { ServerStatus } from '@/types';

test('opens a single join URL exactly once after confirmation', async () => {
  const opened: string[] = [];
  const server = {
    ip: '203.0.113.50', port: '27015', name: 'Test', game: 'Counter-Strike 2', game_id: 730,
  } as ServerStatus;
  const url = await openServerOnce(server, async value => { opened.push(value); });
  assert.equal(opened.length, 1);
  assert.equal(opened[0], url);
  assert.match(url, /^steam:\/\/rungame\/730\//);
  assert.match(url, /203\.0\.113\.50:27015$/);
});

test('rejects an incomplete server without opening an external URL', async () => {
  let calls = 0;
  await assert.rejects(() => openServerOnce({ name: 'Missing address' } as ServerStatus, async () => { calls += 1; }));
  assert.equal(calls, 0);
});
