/**
 * In-memory operation log store.
 * Keeps a rolling buffer of the most recent 20 log entries.
 * No file output — purely for UI display in Settings.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  tag: string;
  message: string;
}

const MAX_ENTRIES = 20;

let nextId = 1;
let entries: LogEntry[] = [];
let listeners: Array<() => void> = [];

function notify() {
  for (const fn of listeners) fn();
}

/** Append a log entry, evicting the oldest when buffer is full. */
export function addLog(level: LogLevel, tag: string, message: string) {
  const entry: LogEntry = {
    id: nextId++,
    timestamp: Date.now(),
    level,
    tag,
    message,
  };
  entries = [...entries, entry].slice(-MAX_ENTRIES);
  notify();
}

/** Convenience helpers */
export const logInfo  = (tag: string, msg: string) => addLog('info',  tag, msg);
export const logWarn  = (tag: string, msg: string) => addLog('warn',  tag, msg);
export const logError = (tag: string, msg: string) => addLog('error', tag, msg);
export const logDebug = (tag: string, msg: string) => addLog('debug', tag, msg);

/** Get the current snapshot (newest last). */
export function getLogEntries(): readonly LogEntry[] {
  return entries;
}

/** Clear all entries. */
export function clearLogs() {
  entries = [];
  notify();
}

/** Subscribe to changes. Returns an unsubscribe function. */
export function subscribeLog(fn: () => void): () => void {
  listeners = [...listeners, fn];
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

/**
 * React hook — useSyncExternalStore compatible selectors.
 * Usage:  const logs = useSyncExternalStore(subscribeLog, getLogEntries);
 */
