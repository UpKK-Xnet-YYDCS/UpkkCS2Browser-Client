import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createSequentialPoller } from './sequentialPoller.ts';

test('runs polling tasks sequentially without overlap', async () => {
  let calls = 0;
  let active = 0;
  let maximumActive = 0;
  let completed!: () => void;
  const done = new Promise<void>(resolve => { completed = resolve; });
  const poller = createSequentialPoller(async () => {
    calls += 1;
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await delay(5);
    active -= 1;
    if (calls === 3) {
      completed();
      return false;
    }
    return true;
  }, 1);

  poller.start();
  await done;
  await delay(0);
  assert.equal(calls, 3);
  assert.equal(maximumActive, 1);
  assert.equal(poller.isRunning(), false);
});

test('does not schedule another task after being stopped during a probe', async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const poller = createSequentialPoller(async () => {
    calls += 1;
    await gate;
    return true;
  }, 1);

  poller.start();
  await delay(0);
  poller.stop();
  release();
  await delay(10);
  assert.equal(calls, 1);
  assert.equal(poller.isRunning(), false);
});
