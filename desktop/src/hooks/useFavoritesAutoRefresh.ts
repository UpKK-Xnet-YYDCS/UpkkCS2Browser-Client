import { useEffect, useRef, useState } from 'react';
import { clearResponseCache } from '@/api/client';
import { nextAutoRefreshCountdown } from '@/services/favoritesPageQuery';

export function useFavoritesAutoRefresh({
  loggedIn,
  refreshInterval,
  loadFavorites,
}: {
  loggedIn: boolean;
  refreshInterval: number;
  loadFavorites: (showLoadingOverlay?: boolean) => void | Promise<void>;
}) {
  const [countdown, setCountdown] = useState(refreshInterval);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetSignalRef = useRef(0);

  useEffect(() => {
    if (!loggedIn || refreshInterval <= 0) return;

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    let lastResetSignal = resetSignalRef.current;

    countdownRef.current = setInterval(() => {
      if (resetSignalRef.current !== lastResetSignal) {
        lastResetSignal = resetSignalRef.current;
        setCountdown(refreshInterval);
        return;
      }

      setCountdown(prev => {
        const tick = nextAutoRefreshCountdown(prev, refreshInterval);
        if (tick.shouldRefresh) {
          clearResponseCache();
          loadFavorites();
        }
        return tick.next;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [refreshInterval, loggedIn, loadFavorites]);

  const bumpRefreshSignal = () => {
    resetSignalRef.current += 1;
  };

  const handleRefresh = () => {
    clearResponseCache();
    loadFavorites(true);
    bumpRefreshSignal();
  };

  return { countdown, handleRefresh, bumpRefreshSignal };
}
