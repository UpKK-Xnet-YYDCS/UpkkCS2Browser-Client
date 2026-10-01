import { useEffect, useRef, useState } from 'react';
import { clearFavoritesResponseCache } from '@/services/favoritesCache';
import { isDocumentHidden, remainingCountdownSeconds } from '@/services/deadlineCountdown';

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
  // Bumped with the deadline so the refresh interval restarts in phase with it.
  const [resetToken, setResetToken] = useState(0);
  const displayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef(0);

  useEffect(() => {
    if (!loggedIn || refreshInterval <= 0) return undefined;

    deadlineRef.current = Date.now() + refreshInterval * 1000;

    const syncDisplay = () => {
      if (!isDocumentHidden()) {
        setCountdown(remainingCountdownSeconds(deadlineRef.current, Date.now()));
      }
    };

    const tick = () => {
      syncDisplay();
      displayTimerRef.current = setTimeout(tick, 1000);
    };

    refreshTimerRef.current = setInterval(() => {
      clearFavoritesResponseCache();
      loadFavorites();
      deadlineRef.current = Date.now() + refreshInterval * 1000;
      setCountdown(refreshInterval);
    }, refreshInterval * 1000);
    displayTimerRef.current = setTimeout(tick, 1000);
    document.addEventListener('visibilitychange', syncDisplay);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
      document.removeEventListener('visibilitychange', syncDisplay);
    };
  }, [refreshInterval, loggedIn, loadFavorites, resetToken]);

  const bumpRefreshSignal = () => {
    deadlineRef.current = Date.now() + refreshInterval * 1000;
    setCountdown(refreshInterval);
    setResetToken(token => token + 1);
  };

  const handleRefresh = () => {
    clearFavoritesResponseCache();
    loadFavorites(true);
    bumpRefreshSignal();
  };

  return { countdown, handleRefresh, bumpRefreshSignal };
}
