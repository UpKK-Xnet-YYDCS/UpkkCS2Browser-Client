import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { XPROJ_USER_AGENT } from '@/api';
import { useUserStore } from '@/store/user';
import { useI18n } from '@/store/i18n';

const FORUM_URL = 'https://bbs.upkk.com';
const CHECK_IN_ENDPOINT = '/plugin.php?id=xnet_core_api:xproj_sign';

interface CheckInResult {
  status: number;
  message: string;
}

const CheckIcon = () => (
  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export function CheckInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoggedIn, openLoginModal } = useUserStore();
  const { t } = useI18n();

  const handleCheckIn = useCallback(async () => {
    // Check if user is logged in
    if (!isLoggedIn || !user) {
      openLoginModal();
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Build the POST body with uid and auth
      const postBody = new URLSearchParams({
        uid: String(user.uid),
        auth: user.user_auth,
      }).toString();

      // Try using Tauri HTTP plugin first (can handle cookies properly)
      try {
        const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
        const response = await tauriFetch(`${FORUM_URL}${CHECK_IN_ENDPOINT}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': XPROJ_USER_AGENT,
          },
          body: postBody,
        });

        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`);
        }

        const data = await response.json();
        setResult({
          status: data.status ?? 0,
          message: data.message ?? '签到完成',
        });
        return;
      } catch (tauriErr) {
        console.log('[CheckIn] Tauri HTTP not available, falling back to fetch:', tauriErr);
      }

      // Fallback to regular fetch
      const response = await fetch(`${FORUM_URL}${CHECK_IN_ENDPOINT}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': XPROJ_USER_AGENT,
          'X-Client-UA': XPROJ_USER_AGENT,
        },
        body: postBody,
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const data = await response.json();
      setResult({
        status: data.status ?? 0,
        message: data.message ?? '签到完成',
      });
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('网络请求失败，请检查网络连接');
      } else {
        setError(err instanceof Error ? err.message : '签到请求失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, user, openLoginModal]);

  const handleOpenForum = async () => {
    try {
      // Use Tauri to open forum in WebView2 window
      await invoke('open_forum_window');
      console.log('[CheckIn] Forum opened in WebView2 window');
    } catch (error) {
      console.error('[CheckIn] Failed to open forum via Tauri:', error);
      // Fallback to shell:open
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(FORUM_URL);
      } catch {
        window.location.href = FORUM_URL;
      }
    }
  };

  const getStatusColor = () => {
    if (!result) return '';
    return result.status === 1 
      ? 'from-green-400 to-emerald-500' 
      : 'from-yellow-400 to-orange-500';
  };

  const getStatusIcon = () => {
    if (!result) return null;
    if (result.status === 1) {
      return (
        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    return (
      <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  };

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-6 text-center">
            <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
              <CalendarIcon />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{t.dailyCheckIn}</h2>
            <p className="text-white/80 text-sm">{t.checkInDesc}</p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Result Display */}
            {result && (
              <div className={`mb-6 p-4 rounded-xl bg-gradient-to-r ${getStatusColor()} text-white text-center`}>
                <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                  {getStatusIcon()}
                </div>
                <p className="text-lg font-medium">{result.message}</p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Status Display */}
            {isLoggedIn && user && (
              <div className="mb-6 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-700 dark:text-green-400 text-sm">
                    {t.loggedInAs.replace('{username}', user.username)}
                  </span>
                </div>
              </div>
            )}

            {/* Check-in Button */}
            <button
              onClick={handleCheckIn}
              disabled={isLoading}
              className={`
                w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3
                ${isLoading
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                }
              `}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  {t.checkingIn}
                </>
              ) : isLoggedIn ? (
                <>
                  <CheckIcon />
                  {t.checkInNow}
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t.pleaseLoginFirst}
                </>
              )}
            </button>

            {/* Login/Forum Link */}
            <div className="mt-6 text-center">
              {isLoggedIn ? (
                <button
                  onClick={handleOpenForum}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {t.goToForum}
                </button>
              ) : (
                <button
                  onClick={openLoginModal}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t.clickToLogin}
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{isLoggedIn ? t.usingSteamID64 : t.loginForCheckIn}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
