import type { MatchedServer } from './monitorTypes.ts';

export type NotifyTestResult = string | null;

export function notifyTestLabel(
  result: NotifyTestResult,
  labels: { testing: string; success: string; failed: string; idle: string },
): string {
  if (result === 'testing') return labels.testing;
  if (result === 'success') return '✓ ' + labels.success;
  if (result === 'failed') return '✗ ' + labels.failed;
  return labels.idle;
}

export function notifyDesktopTestButtonClass(result: NotifyTestResult): string {
  const base = 'px-2.5 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 ';
  if (result === 'success') return base + 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
  if (result === 'failed') return base + 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  return base + 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500';
}

export function notifyChannelTestButtonClass(result: NotifyTestResult, idleClass: string): string {
  const base = 'px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 ';
  if (result === 'success') return base + 'bg-green-500 text-white';
  if (result === 'failed') return base + 'bg-red-500 text-white';
  return base + idleClass;
}

export function notifyPlaceholderLookupKey(key: string): string {
  return 'monitorPlaceholder_' + key.replace(/[{}]/g, '');
}

export const NOTIFY_PREVIEW_SAMPLE = {
  serverKey: '127.0.0.1:27015',
  serverName: 'My Server',
  mapName: 'ze_example_map',
  players: 32,
  maxPlayers: 64,
  matchedRule: 'My Rule',
  matchedPattern: 'ze_*',
} as const;

export function notifyPreviewSample(matchedAt = new Date().toISOString()) {
  return { ...NOTIFY_PREVIEW_SAMPLE, matchedAt };
}

export const NOTIFY_TEST_RESET_MS = 3000;

export function notifyChannelInputClass(focusClass: string): string {
  return 'w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-4 ' + focusClass + ' transition-all';
}

export function createNotifyTestMatch(matchedAt = new Date().toISOString()): MatchedServer {
  return {
    serverKey: '127.0.0.1:27015',
    serverName: 'Test Server',
    mapName: 'ze_test_map',
    players: 32,
    maxPlayers: 64,
    matchedRule: 'Test Rule',
    matchedPattern: 'ze_*',
    matchedAt,
  };
}

export async function runNotifyTest(
  setResult: (result: NotifyTestResult) => void,
  task: () => Promise<boolean>,
): Promise<void> {
  setResult('testing');
  const ok = await task();
  setResult(ok ? 'success' : 'failed');
  setTimeout(() => setResult(null), NOTIFY_TEST_RESET_MS);
}
