import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useUserStore } from '@/store/user';
import { useI18n } from '@/store/i18n';

const FORUM_URL = 'https://bbs.upkk.com';

// Icons
const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ExternalIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ForumIcon = () => (
  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
  </svg>
);

type ForumStatus = 'loading' | 'opened' | 'error' | 'waiting-login';

export function ForumPage() {
  const [status, setStatus] = useState<ForumStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const openAttempted = useRef(false);
  const { user, isLoggedIn, openLoginModal } = useUserStore();
  const { t } = useI18n();

  const openForumWindow = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');
    
    console.log('[Forum] Attempting to open forum...');
    
    try {
      // Try to import Tauri API - this will fail in non-Tauri environments
      console.log('[Forum] Importing Tauri API...');
      if (isLoggedIn && user) {
        // Use POST login with uid and auth
        console.log('[Forum] Opening forum with POST login for user:', user.username);
        await invoke('open_forum_with_login', { 
          uid: String(user.uid), 
          auth: user.user_auth 
        });
      } else {
        // Open forum without login
        console.log('[Forum] Opening forum without login');
        await invoke('open_forum_window');
      }
      
      console.log('[Forum] Forum window opened successfully');
      setStatus('opened');
    } catch (error) {
      console.error('[Forum] Failed to open forum window:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      
      // Check if it's a module import error (not in Tauri)
      if (errMsg.includes('module') || errMsg.includes('import') || errMsg.includes('Cannot find')) {
        setErrorMessage(t.tauriNotDetected);
      } else {
        setErrorMessage(`${t.openForumFailedMsg}: ${errMsg}`);
      }
      setStatus('error');
    }
  }, [isLoggedIn, user, t]);

  // Auto-open forum on mount, but show login modal if not logged in
  useEffect(() => {
    if (!openAttempted.current) {
      openAttempted.current = true;
      // If not logged in, show login modal and wait for login
      if (!isLoggedIn) {
        openLoginModal();
        setStatus('waiting-login');
      } else {
        openForumWindow();
      }
    }
  }, [openForumWindow, isLoggedIn, openLoginModal]);

  // Open forum after user logs in (only if we were waiting for login)
  useEffect(() => {
    if (isLoggedIn && status === 'waiting-login') {
      openForumWindow();
    }
  }, [isLoggedIn, status, openForumWindow]);

  const handleRetry = () => {
    // If not logged in, show login modal first
    if (!isLoggedIn) {
      openLoginModal();
      return;
    }
    openAttempted.current = false;
    openForumWindow();
  };

  const handleOpenExternal = async () => {
    try {
      // Use Tauri shell:open to open in system browser
      // Note: External browser can't do POST, so we just open the base forum URL
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(FORUM_URL);
      console.log('[Forum] Opened in system browser via Tauri shell:', FORUM_URL);
    } catch (error) {
      console.error('[Forum] Failed to open via Tauri shell, falling back:', error);
      // Fallback to window.location for Tauri environment
      window.location.href = FORUM_URL;
    }
  };

  // Waiting for login state
  if (status === 'waiting-login') {
    return (
      <div className="h-full flex-1 flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium text-lg mb-2">{t.loginFirst}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">{t.loginForAutoLogin}</p>
          <button
            onClick={openLoginModal}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            {t.clickToLogin}
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="h-full flex-1 flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">{t.openingForum}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">{t.usingWebView2}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="h-full flex-1 flex items-center justify-center bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 dark:from-gray-900 dark:via-red-900/20 dark:to-gray-900 p-8">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.openForumFailed}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t.cannotOpenWebView2}
            </p>
            {errorMessage && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
                <p className="text-sm text-red-600 dark:text-red-400 font-mono break-all">{errorMessage}</p>
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                <RefreshIcon />
                重试
              </button>
              <button
                onClick={handleOpenExternal}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all"
              >
                <ExternalIcon />
                在系统浏览器中打开
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="h-full flex-1 flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 p-8">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
            <ForumIcon />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.forumOpened}</h2>
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{t.usingWebView2}</span>
          </div>
          
          {/* Login Status */}
          {isLoggedIn && user ? (
            <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-blue-700 dark:text-blue-400 text-sm">
                  {t.loggedInAutoLogin.replace('{username}', user.username)}
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-yellow-700 dark:text-yellow-400 text-sm">
                  {t.notLoggedInGuest}
                </span>
              </div>
              <button
                onClick={openLoginModal}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                {t.clickToLogin}
              </button>
            </div>
          )}
          
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {t.forumRunsInWindow}
          </p>
          <p className="text-sm text-blue-500 dark:text-blue-400 mb-6 flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            {t.forumMultiTabSupport}
          </p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              <RefreshIcon />
              {t.reopenForum}
            </button>
            <button
              onClick={handleOpenExternal}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all"
            >
              <ExternalIcon />
              {t.openInBrowser}
            </button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
            </svg>
            <span>{t.secureConnection} · {FORUM_URL}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
