import assert from 'node:assert/strict';
import test from 'node:test';
import { clearDesktopLocalData, clearMonitorDataFile, deleteIndexedDbDatabases } from './settingsClearData.ts';

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
    async clearMonitorData() { steps.push('monitor-data'); },
  });
  assert.deepEqual(steps, ['token', 'local', 'session', 'list-db', 'delete-db:cache', 'credentials', 'monitor-data']);
});

function stubTauriInvoke(invoke: (command: string, args: unknown) => Promise<unknown>): () => void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { __TAURI_INTERNALS__: { invoke } },
  });
  return () => {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  };
}

test('clearing data also empties the monitor rules file that restores rules on start', async () => {
  const calls: Array<{ command: string; args: unknown }> = [];
  const restore = stubTauriInvoke(async (command, args) => {
    calls.push({ command, args });
  });
  try {
    await clearDesktopLocalData({
      async clearPersistedCloudApiToken() {},
      localStorage: { clear() {} },
      sessionStorage: { clear() {} },
      async clearCredentials() {},
    });
  } finally {
    restore();
  }
  assert.deepEqual(calls, [{ command: 'save_monitor_data', args: { data: '' } }]);
});

test('a failed monitor file clear does not block the restart', async () => {
  const restore = stubTauriInvoke(async () => {
    throw 'Failed to save monitor data: disk full';
  });
  try {
    await clearMonitorDataFile();
  } finally {
    restore();
  }
  // Without the desktop runtime (browser preview) it is a no-op as well.
  await clearMonitorDataFile();
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
