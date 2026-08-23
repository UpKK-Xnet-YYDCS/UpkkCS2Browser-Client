import { useCallback, useEffect, useRef, useState } from 'react';
import { useUserStore } from '@/hooks/useUserStore';
import { useI18n } from '@/hooks/useI18n';
import {
  formatForumWindowError,
  openForumDesktopWindow,
  openForumExternalBrowser,
} from '@/services/forumWindow';

export type ForumStatus = 'loading' | 'opened' | 'error' | 'waiting-login';

export function useForumPage() {
  const [status, setStatus] = useState<ForumStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const openAttempted = useRef(false);
  const { user, isLoggedIn, openLoginModal } = useUserStore();
  const { t } = useI18n();

  const openForumWindow = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');

    try {
      await openForumDesktopWindow(isLoggedIn && user ? user : null);
      setStatus('opened');
    } catch (error) {
      console.error('[Forum] Failed to open forum window:', error);
      setErrorMessage(formatForumWindowError(error, t));
      setStatus('error');
    }
  }, [isLoggedIn, user, t]);

  useEffect(() => {
    if (!openAttempted.current) {
      openAttempted.current = true;
      const timer = window.setTimeout(() => {
        if (!isLoggedIn) {
          openLoginModal();
          setStatus('waiting-login');
        } else {
          void openForumWindow();
        }
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [openForumWindow, isLoggedIn, openLoginModal]);

  useEffect(() => {
    if (isLoggedIn && status === 'waiting-login') {
      const timer = window.setTimeout(() => {
        void openForumWindow();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [isLoggedIn, status, openForumWindow]);

  const handleRetry = () => {
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    openAttempted.current = false;
    openForumWindow();
  };

  return {
    status,
    errorMessage,
    user,
    isLoggedIn,
    openLoginModal,
    t,
    handleRetry,
    handleOpenExternal: openForumExternalBrowser,
  };
}

