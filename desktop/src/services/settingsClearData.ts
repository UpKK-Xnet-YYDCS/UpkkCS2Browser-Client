import { invokeDesktop } from './desktopRuntime.ts';

type IndexedDbLike = {
  databases?: () => Promise<Array<{ name?: string }>>;
  deleteDatabase: (name: string) => {
    onsuccess: unknown;
    onerror: unknown;
    onblocked: unknown;
    error?: unknown;
  };
};

export async function deleteIndexedDbDatabases(factory: IndexedDbLike): Promise<void> {
  if (!factory.databases) return;
  const databases = await factory.databases();
  await Promise.all(databases.map((db) => {
    if (!db.name) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const request = factory.deleteDatabase(db.name!);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  }));
}

/**
 * The monitor restores its rules from monitor_data.json on start, so clearing
 * localStorage alone brings them back. The loader treats an empty file as "no
 * data". Best effort, like the other monitor file writes: the browser preview
 * has no file, and a failed write must not block the restart.
 */
export async function clearMonitorDataFile(): Promise<void> {
  try {
    await invokeDesktop('save_monitor_data', { data: '' });
  } catch {
    // Tauri not available or the write failed.
  }
}

export async function clearDesktopLocalData(deps: {
  clearPersistedCloudApiToken: () => Promise<unknown>;
  localStorage: { clear: () => void };
  sessionStorage: { clear: () => void };
  indexedDB?: IndexedDbLike;
  clearCredentials: () => Promise<unknown>;
  clearMonitorData?: () => Promise<unknown>;
}): Promise<void> {
  await deps.clearPersistedCloudApiToken();
  deps.localStorage.clear();
  deps.sessionStorage.clear();
  if (deps.indexedDB) {
    await deleteIndexedDbDatabases(deps.indexedDB);
  }
  await deps.clearCredentials();
  await (deps.clearMonitorData ?? clearMonitorDataFile)();
}
