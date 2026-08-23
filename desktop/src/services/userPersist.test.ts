import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REMEMBER_ME_STORAGE_KEY,
  USER_SESSION_STORAGE_KEY,
  persistRememberMeFlag,
  persistUserSession,
  readRememberMeFlag,
} from './userPersist.ts';

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    setItem(key: string, value: string) { store.set(key, value); },
    removeItem(key: string) { store.delete(key); },
  };
}

test('persistUserSession writes JSON and removes the existing key on logout', () => {
  const storage = memoryStorage();
  persistUserSession({ uid: 1, username: 'Ada', steamid64: '765', user_auth: 't', isLogin: true }, storage);
  assert.equal(
    storage.store.get(USER_SESSION_STORAGE_KEY),
    JSON.stringify({ uid: 1, username: 'Ada', steamid64: '765', user_auth: 't', isLogin: true }),
  );
  persistUserSession(null, storage);
  assert.equal(storage.store.has(USER_SESSION_STORAGE_KEY), false);
});

test('remember-me defaults to true and only stores the existing string flags', () => {
  assert.equal(readRememberMeFlag(null), true);
  assert.equal(readRememberMeFlag('true'), true);
  assert.equal(readRememberMeFlag('false'), false);
  assert.equal(readRememberMeFlag('other'), false);
  const storage = memoryStorage();
  persistRememberMeFlag(true, storage);
  assert.equal(storage.store.get(REMEMBER_ME_STORAGE_KEY), 'true');
  persistRememberMeFlag(false, storage);
  assert.equal(storage.store.get(REMEMBER_ME_STORAGE_KEY), 'false');
});
