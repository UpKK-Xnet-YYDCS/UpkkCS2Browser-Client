import assert from 'node:assert/strict';
import test from 'node:test';

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

const {
  cancelPrefetch,
  collectPrefetchPageNumbers,
  isPrefetchSequenceCurrent,
  startPrefetchSequence,
} = await import('./clientPrefetch.ts');

test('prefetch page numbers are the next pages only and never pre-build work', () => {
  assert.deepEqual(collectPrefetchPageNumbers(1, 10, 3), [2, 3, 4]);
  assert.deepEqual(collectPrefetchPageNumbers(8, 10, 5), [9, 10]);
  assert.deepEqual(collectPrefetchPageNumbers(10, 10, 5), []);
  assert.deepEqual(collectPrefetchPageNumbers(1, 10, 0), []);
  assert.deepEqual(collectPrefetchPageNumbers(0, 3, 2), [1, 2]);
});

test('starting a new prefetch sequence aborts the previous controller', () => {
  const first = startPrefetchSequence();
  assert.equal(isPrefetchSequenceCurrent(first.version), true);
  assert.equal(first.signal.aborted, false);

  const second = startPrefetchSequence();
  assert.equal(first.signal.aborted, true);
  assert.equal(isPrefetchSequenceCurrent(first.version), false);
  assert.equal(isPrefetchSequenceCurrent(second.version), true);
  assert.equal(second.signal.aborted, false);

  cancelPrefetch();
  assert.equal(second.signal.aborted, true);
  assert.equal(isPrefetchSequenceCurrent(second.version), false);
});
