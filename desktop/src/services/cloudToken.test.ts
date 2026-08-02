import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCloudApiToken,
  initializeCloudApiToken,
  LEGACY_API_TOKEN_KEY,
  setCloudApiTokenInMemory,
  type SecureTokenStorage,
} from './cloudToken.ts';

function memoryLegacy(token: string | null) {
  const values = new Map<string, string>();
  if (token) values.set(LEGACY_API_TOKEN_KEY, token);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => { values.delete(key); },
    has: (key: string) => values.has(key),
  };
}

function secureStorage(initial: string | null = null): SecureTokenStorage & { saved: string[] } {
  let value = initial;
  const saved: string[] = [];
  return {
    saved,
    load: async () => value,
    save: async (token) => { value = token; saved.push(token); },
    clear: async () => { value = null; },
  };
}

test('migrates a legacy plaintext token into secure storage', async () => {
  setCloudApiTokenInMemory(null);
  const legacy = memoryLegacy('legacy-token');
  const secure = secureStorage();

  const result = await initializeCloudApiToken({
    isTauri: true,
    legacyStorage: legacy,
    secureStorage: secure,
  });

  assert.deepEqual(result, { token: 'legacy-token', migrated: true, persistence: 'secure' });
  assert.deepEqual(secure.saved, ['legacy-token']);
  assert.equal(legacy.has(LEGACY_API_TOKEN_KEY), false);
  assert.equal(getCloudApiToken(), 'legacy-token');
});

test('secure token wins and removes a stale plaintext token', async () => {
  const legacy = memoryLegacy('stale-token');
  const result = await initializeCloudApiToken({
    isTauri: true,
    legacyStorage: legacy,
    secureStorage: secureStorage('secure-token'),
  });

  assert.equal(result.token, 'secure-token');
  assert.equal(result.persistence, 'secure');
  assert.equal(legacy.has(LEGACY_API_TOKEN_KEY), false);
});

test('browser preview imports a legacy token only into memory', async () => {
  const legacy = memoryLegacy('preview-token');
  const result = await initializeCloudApiToken({ isTauri: false, legacyStorage: legacy });

  assert.deepEqual(result, { token: 'preview-token', migrated: true, persistence: 'memory' });
  assert.equal(legacy.has(LEGACY_API_TOKEN_KEY), false);
  assert.equal(getCloudApiToken(), 'preview-token');
});

test('removes the plaintext token even when secure persistence is unavailable', async () => {
  const legacy = memoryLegacy('one-time-token');
  const secure = secureStorage();
  secure.save = async () => { throw new Error('disk unavailable'); };

  const result = await initializeCloudApiToken({ isTauri: true, legacyStorage: legacy, secureStorage: secure });

  assert.equal(result.persistence, 'memory');
  assert.equal(result.migrated, true);
  assert.equal(legacy.has(LEGACY_API_TOKEN_KEY), false);
  assert.equal(getCloudApiToken(), 'one-time-token');
});
