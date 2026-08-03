import assert from 'node:assert/strict';
import test from 'node:test';
import { mapWithConcurrency } from './concurrency.ts';

test('concurrency mapper caps active work and preserves input order', async () => {
  let active = 0;
  let maximum = 0;
  const results = await mapWithConcurrency([4, 3, 2, 1], 2, async value => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, value));
    active -= 1;
    return value * 10;
  });
  assert.equal(maximum, 2);
  assert.deepEqual(results, [40, 30, 20, 10]);
});
