import { useSyncExternalStore } from 'react';

const DEEP_SCAN_KEY = 'desktopLatencyDeepScanEnabled';
const WORKER_COUNT_KEY = 'desktopLatencyWorkerCount';
const RETRY_COUNT_KEY = 'desktopLatencyRetryCount';
const RETRY_DELAY_MS_KEY = 'desktopLatencyRetryDelayMs';
const listeners = new Set<() => void>();

export interface LatencyDetectionSettings {
  deepScanEnabled: boolean;
  workerCount: number;
  retryCount: number;
  retryDelayMs: number;
}

export const DEFAULT_LATENCY_DETECTION_SETTINGS: LatencyDetectionSettings = {
  deepScanEnabled: false,
  workerCount: 3,
  retryCount: 1,
  retryDelayMs: 300,
};

function notifyLatencySettingsChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

function clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value) || value === undefined) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function readNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage failures and still update in-memory subscribers.
  }
}

export function normalizeLatencyDetectionSettings(settings: Partial<LatencyDetectionSettings>): LatencyDetectionSettings {
  return {
    deepScanEnabled: Boolean(settings.deepScanEnabled),
    workerCount: clampInteger(settings.workerCount, DEFAULT_LATENCY_DETECTION_SETTINGS.workerCount, 1, 6),
    retryCount: clampInteger(settings.retryCount, DEFAULT_LATENCY_DETECTION_SETTINGS.retryCount, 0, 5),
    retryDelayMs: clampInteger(settings.retryDelayMs, DEFAULT_LATENCY_DETECTION_SETTINGS.retryDelayMs, 0, 3_000),
  };
}

export function getLatencyDeepScanEnabled(): boolean {
  try {
    return localStorage.getItem(DEEP_SCAN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function getLatencyDetectionSettings(): LatencyDetectionSettings {
  return normalizeLatencyDetectionSettings({
    deepScanEnabled: getLatencyDeepScanEnabled(),
    workerCount: readNumber(WORKER_COUNT_KEY, DEFAULT_LATENCY_DETECTION_SETTINGS.workerCount),
    retryCount: readNumber(RETRY_COUNT_KEY, DEFAULT_LATENCY_DETECTION_SETTINGS.retryCount),
    retryDelayMs: readNumber(RETRY_DELAY_MS_KEY, DEFAULT_LATENCY_DETECTION_SETTINGS.retryDelayMs),
  });
}

function getLatencyDetectionSettingsSnapshot(): string {
  return JSON.stringify(getLatencyDetectionSettings());
}

export function setLatencyDeepScanEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(DEEP_SCAN_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage failures and still update in-memory subscribers.
  }
  notifyLatencySettingsChanged();
}

export function setLatencyWorkerCount(workerCount: number): void {
  const next = normalizeLatencyDetectionSettings({ workerCount }).workerCount;
  writeNumber(WORKER_COUNT_KEY, next);
  notifyLatencySettingsChanged();
}

export function setLatencyRetryCount(retryCount: number): void {
  const next = normalizeLatencyDetectionSettings({ retryCount }).retryCount;
  writeNumber(RETRY_COUNT_KEY, next);
  notifyLatencySettingsChanged();
}

export function setLatencyRetryDelayMs(retryDelayMs: number): void {
  const next = normalizeLatencyDetectionSettings({ retryDelayMs }).retryDelayMs;
  writeNumber(RETRY_DELAY_MS_KEY, next);
  notifyLatencySettingsChanged();
}

export function subscribeLatencySettings(callback: () => void): () => void {
  listeners.add(callback);
  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === DEEP_SCAN_KEY ||
      event.key === WORKER_COUNT_KEY ||
      event.key === RETRY_COUNT_KEY ||
      event.key === RETRY_DELAY_MS_KEY
    ) {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

export function useLatencyDeepScanEnabled(): boolean {
  return useSyncExternalStore(
    subscribeLatencySettings,
    getLatencyDeepScanEnabled,
    () => false,
  );
}

export function useLatencyDetectionSettings(): LatencyDetectionSettings {
  const snapshot = useSyncExternalStore(
    subscribeLatencySettings,
    getLatencyDetectionSettingsSnapshot,
    () => JSON.stringify(DEFAULT_LATENCY_DETECTION_SETTINGS),
  );
  return JSON.parse(snapshot) as LatencyDetectionSettings;
}
