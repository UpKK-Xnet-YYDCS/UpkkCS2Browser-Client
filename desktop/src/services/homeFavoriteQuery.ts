import type { Dispatch, SetStateAction } from 'react';
import {
  isTauriAvailable,
  parseServerAddress,
} from '@/services/a2s';
import {
  makeOfflinePlaceholder,
  mapA2SFailurePatch,
  mapA2SSuccessToServerStatus,
  queryFavoriteServerWithRetry,
  replaceFavoriteServerInPlace,
} from '@/services/homeFavoriteA2S';
import {
  favoriteExportFilename,
  serializeFavoriteExport,
} from '@/services/homeFavoriteFilters';
import { saveJsonWithDialog } from '@/services/desktopRuntime';
import { showToast } from '@/services/toast';
import type { ServerStatus } from '@/types';

export interface HomeFavoriteQueryOptions {
  timeoutMs: number;
  workerCount: number;
  retryCount: number;
  retryDelayMs: number;
}

export async function loadHomeFavoriteServers(
  favorites: string[],
  latencySchedulerOptions: HomeFavoriteQueryOptions,
  setFavServers: Dispatch<SetStateAction<ServerStatus[]>>,
  setFavLoading: Dispatch<SetStateAction<boolean>>,
): Promise<void> {
    if (favorites.length === 0) {
      setFavServers([]);
      return;
    }
    setFavLoading(true);

    const latencyStatus = isTauriAvailable() ? 'queued' : 'unavailable';
    const parsedList = favorites.map(addr => ({ addr, parsed: parseServerAddress(addr) }));
    const initialList = parsedList
      .filter(e => e.parsed !== null)
      .map(e => makeOfflinePlaceholder(e.parsed!.ip, e.parsed!.port, {
        now: new Date().toISOString(),
        latencyStatus,
      }));
    setFavServers(initialList);

    try {
      const QUERY_TIMEOUT_MS = latencySchedulerOptions.timeoutMs;
      const CONCURRENCY = latencySchedulerOptions.workerCount;
      const validParsed = parsedList.filter(e => e.parsed !== null).map(e => e.parsed!);
      let nextIndex = 0;

      const worker = async () => {
        while (true) {
          const idx = nextIndex++;
          if (idx >= validParsed.length) break;
          const parsed = validParsed[idx];
          try {
            setFavServers(prev => replaceFavoriteServerInPlace(prev, parsed, current => ({
              ...current,
              local_latency_status: 'checking',
              local_latency_error: undefined,
            })));
            const a2s = await queryFavoriteServerWithRetry(parsed, {
              timeoutMs: QUERY_TIMEOUT_MS,
              retryCount: latencySchedulerOptions.retryCount,
              retryDelayMs: latencySchedulerOptions.retryDelayMs,
            });
            if (a2s && a2s.success) {
              const server = mapA2SSuccessToServerStatus(a2s, parsed, new Date().toISOString());
              setFavServers(prev => replaceFavoriteServerInPlace(prev, parsed, server));
            } else {
              setFavServers(prev => replaceFavoriteServerInPlace(prev, parsed, current => ({
                ...current,
                ...mapA2SFailurePatch(a2s?.error || 'A2S query failed', new Date().toISOString()),
              })));
            }
          } catch (error) {
            setFavServers(prev => replaceFavoriteServerInPlace(prev, parsed, current => ({
              ...current,
              ...mapA2SFailurePatch(
                error instanceof Error ? error.message : String(error),
                new Date().toISOString(),
              ),
            })));
          }
        }
      };

      await Promise.allSettled(Array.from({ length: CONCURRENCY }, () => worker()));
    } catch (err) {
      console.error('[HomePage] Failed to fetch favorite servers via A2S:', err);
    } finally {
      setFavLoading(false);
    }
}

export async function exportHomeFavorites(
  favorites: readonly string[],
  copy: { title: string; success: string },
): Promise<void> {
  const filename = favoriteExportFilename();
  const data = serializeFavoriteExport(favorites);

  if (isTauriAvailable()) {
    try {
      const filePath = await saveJsonWithDialog(filename, copy.title, data);
      if (filePath) {
        showToast(copy.success + filePath, '', 'info', 5000);
      }
    } catch (err) {
      console.error('Export failed:', err);
      showToast(String(err), '', 'error', 5000);
    }
    return;
  }

  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(copy.success + filename, '', 'info', 5000);
}
