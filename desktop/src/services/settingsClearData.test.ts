import assert from 'node:assert/strict';
import test from 'node:test';
import { clearDesktopLocalData, deleteIndexedDbDatabases } from './settingsClearData.ts';

test('clearDesktopLocalData keeps token, web storage, databases, then credentials order', async () => {
  const steps: string[] = [];
  const request = {
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onblocked: null as (() => void) | null,
    error: null,
  };
  await clearDesktopLocalData({
    async clearPersistedCloudApiToken() { steps.push('token'); },
    localStorage: { clear() { steps.push('local'); } },
    sessionStorage: { clear() { steps.push('session'); } },
    indexedDB: {
      async databases() { steps.push('list-db'); return [{ name: 'cache' }]; },
      deleteDatabase(name: string) {
        steps.push(`delete-db:${name}`);
        queueMicrotask(() => request.onsuccess?.());
        return request;
      },
    },
    async clearCredentials() { steps.push('credentials'); },
  });
  assert.deepEqual(steps, ['token', 'local', 'session', 'list-db', 'delete-db:cache', 'credentials']);
});

test('deleteIndexedDbDatabases treats blocked deletes as success', async () => {
  const request = {
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onblocked: null as (() => void) | null,
    error: null,
  };
  const pending = deleteIndexedDbDatabases({
    async databases() { return [{ name: 'locked' }]; },
    deleteDatabase() {
      queueMicrotask(() => request.onblocked?.());
      return request;
    },
  });
  await pending;
});
