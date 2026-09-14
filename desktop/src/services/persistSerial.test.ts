import assert from 'node:assert/strict';
import test from 'node:test';
import { createLatestSerialWriter } from './persistSerial.ts';

test('serial writer never lets an older snapshot finish after a newer one', async () => {
  const written: string[] = [];
  let releaseFirst: (() => void) | undefined;
  const write = createLatestSerialWriter(async (value: string) => {
    if (value === 'one') {
      await new Promise<void>(resolve => {
        releaseFirst = resolve;
      });
    }
    written.push(value);
  });

  const first = write('one');
  await Promise.resolve();
  assert.equal(typeof releaseFirst, 'function');
  const second = write('two');
  const third = write('three');
  releaseFirst?.();
  await Promise.all([first, second, third]);
  assert.deepEqual(written, ['one', 'three']);
});

test('a failed write does not block the latest snapshot', async () => {
  const written: string[] = [];
  const write = createLatestSerialWriter(async (value: string) => {
    if (value === 'bad') throw new Error('disk full');
    written.push(value);
  });

  await write('ok');
  await write('bad');
  await write('newer');
  assert.deepEqual(written, ['ok', 'newer']);
});
