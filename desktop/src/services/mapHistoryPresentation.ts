export const MAP_HISTORY_PAGE_SIZE = 5;

export function isCurrentMapSession(page: number, index: number): boolean {
  return page === 1 && index === 0;
}

export function mapSessionChartSeries(playerHistory: readonly number[], botHistory?: readonly number[]): {
  realPlayers: number[];
  bots: number[];
  maxValue: number;
} {
  const realPlayers = Array.from(playerHistory);
  const bots = Array.from(botHistory || []);
  return {
    realPlayers,
    bots,
    maxValue: Math.max(...realPlayers, ...bots, 1),
  };
}

export function mapSessionSampleInterval(durationSecs: number, dataPoints: number): number {
  return dataPoints > 1 ? durationSecs / (dataPoints - 1) : durationSecs;
}

export function formatMapSessionAxisTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function mapSessionRowClass(isCurrentMap: boolean): string {
  return 'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ' + (
    isCurrentMap
      ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800'
      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
  );
}

export function mapSessionIconClass(isCurrentMap: boolean): string {
  return 'w-8 h-8 rounded-lg flex items-center justify-center text-white ' + (
    isCurrentMap
      ? 'bg-gradient-to-br from-green-400 to-emerald-500'
      : 'bg-gradient-to-br from-green-500 to-emerald-600'
  );
}

export function mapSessionDurationClass(isCurrentMap: boolean): string {
  return 'text-xs px-2 py-1 rounded-full ' + (
    isCurrentMap
      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
  );
}

export function mapHistoryLoadError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
