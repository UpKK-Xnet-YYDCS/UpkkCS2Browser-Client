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
  DEFAULT_SKIP_JOIN_CONFIRM,
  SKIP_JOIN_CONFIRM_KEY,
  getSkipJoinConfirm,
  normalizeSkipJoinConfirm,
  setSkipJoinConfirm,
} = await import('./joinConfirmPreference.ts');

test.describe('skip join confirmation preference', { concurrency: false }, () => {
  test('skip join confirmation defaults on when nothing is stored', () => {
    memory.clear();
    assert.equal(DEFAULT_SKIP_JOIN_CONFIRM, true);
    assert.equal(normalizeSkipJoinConfirm(null), true);
    assert.equal(normalizeSkipJoinConfirm('true'), true);
    assert.equal(normalizeSkipJoinConfirm('unexpected'), true);
    assert.equal(normalizeSkipJoinConfirm('false'), false);
    assert.equal(getSkipJoinConfirm(), true);
  });

  test('persists skip join confirmation as false only when turned off', () => {
    memory.clear();
    assert.equal(getSkipJoinConfirm(), true);
    setSkipJoinConfirm(false);
    assert.equal(memory.get(SKIP_JOIN_CONFIRM_KEY), 'false');
    assert.equal(getSkipJoinConfirm(), false);
    setSkipJoinConfirm(true);
    assert.equal(memory.get(SKIP_JOIN_CONFIRM_KEY), 'true');
    assert.equal(getSkipJoinConfirm(), true);
  });
});
