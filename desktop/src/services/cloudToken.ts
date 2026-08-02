export const LEGACY_API_TOKEN_KEY = 'xproj_api_token';

export interface SecureTokenStorage {
  load(): Promise<string | null>;
  save(token: string): Promise<void>;
  clear(): Promise<void>;
}

export interface TokenInitializationOptions {
  isTauri?: boolean;
  legacyStorage?: Pick<Storage, 'getItem' | 'removeItem'>;
  secureStorage?: SecureTokenStorage;
}

export interface TokenInitializationResult {
  token: string | null;
  migrated: boolean;
  persistence: 'secure' | 'memory' | 'none';
}

let apiToken: string | null = null;

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function browserStorage(): Pick<Storage, 'getItem' | 'removeItem'> | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

async function tauriTokenStorage(): Promise<SecureTokenStorage> {
  const storage = await import('./secureStorage');
  return {
    async load() {
      const result = await storage.loadApiToken();
      return result.success ? result.token ?? null : null;
    },
    async save(token) {
      const result = await storage.saveApiToken(token);
      if (!result.success) throw new Error(result.message);
    },
    async clear() {
      const result = await storage.clearApiToken();
      if (!result.success) throw new Error(result.message);
    },
  };
}

export function getCloudApiToken(): string | null {
  return apiToken;
}

export function setCloudApiTokenInMemory(token: string | null): void {
  apiToken = token?.trim() || null;
}

export async function initializeCloudApiToken(
  options: TokenInitializationOptions = {},
): Promise<TokenInitializationResult> {
  const tauri = options.isTauri ?? isTauriRuntime();
  const legacyStorage = options.legacyStorage ?? browserStorage();
  const legacyToken = legacyStorage?.getItem(LEGACY_API_TOKEN_KEY)?.trim() || null;
  let secureStorage = options.secureStorage;
  let secureToken: string | null = null;

  if (tauri) {
    try {
      secureStorage ??= await tauriTokenStorage();
      secureToken = await secureStorage.load();
    } catch {
      secureToken = null;
    }
  }

  if (secureToken) {
    setCloudApiTokenInMemory(secureToken);
    legacyStorage?.removeItem(LEGACY_API_TOKEN_KEY);
    return { token: secureToken, migrated: Boolean(legacyToken), persistence: 'secure' };
  }

  if (legacyToken) {
    setCloudApiTokenInMemory(legacyToken);
    if (tauri && secureStorage) {
      try {
        await secureStorage.save(legacyToken);
        legacyStorage?.removeItem(LEGACY_API_TOKEN_KEY);
        return { token: legacyToken, migrated: true, persistence: 'secure' };
      } catch {
        legacyStorage?.removeItem(LEGACY_API_TOKEN_KEY);
        return { token: legacyToken, migrated: true, persistence: 'memory' };
      }
    }

    // Browser preview deliberately keeps authentication only for this page lifetime.
    legacyStorage?.removeItem(LEGACY_API_TOKEN_KEY);
    return { token: legacyToken, migrated: true, persistence: 'memory' };
  }

  setCloudApiTokenInMemory(null);
  return { token: null, migrated: false, persistence: 'none' };
}

export async function persistCloudApiToken(token: string): Promise<void> {
  setCloudApiTokenInMemory(token);
  browserStorage()?.removeItem(LEGACY_API_TOKEN_KEY);
  if (!isTauriRuntime()) return;

  const storage = await tauriTokenStorage();
  await storage.save(token);
}

export async function clearPersistedCloudApiToken(): Promise<void> {
  setCloudApiTokenInMemory(null);
  browserStorage()?.removeItem(LEGACY_API_TOKEN_KEY);
  if (!isTauriRuntime()) return;

  const storage = await tauriTokenStorage();
  await storage.clear();
}
