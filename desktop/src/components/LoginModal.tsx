import { useState, type FormEvent } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { useUserStore } from '@/hooks/useUserStore';
import { openExternalUrl } from '@/services/desktopRuntime';
import { STEAM_SECURE_CODE_URL, canSubmitSteamLogin } from '@/services/loginSubmit';
import {
  ExternalLinkIcon,
  LoadingSpinner,
  ShieldIcon,
  SteamIcon,
  UserIcon,
  XIcon,
} from './loginIcons';

export function LoginModal() {
  const { t } = useI18n();
  const { showLoginModal, closeLoginModal, login, isLoading, error, rememberMe, setRememberMe } = useUserStore();
  const [steamid64, setSteamid64] = useState('');
  const [securecode, setSecurecode] = useState('');

  if (!showLoginModal) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmitSteamLogin(steamid64, securecode)) {
      return;
    }
    await login(steamid64.trim(), securecode.trim(), rememberMe);
  };

  const handleOpenSecureCodePage = async () => {
    try {
      await openExternalUrl(STEAM_SECURE_CODE_URL);
    } catch {
      window.open(STEAM_SECURE_CODE_URL, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
              <UserIcon />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t.loginModalTitle}</h2>
              <p className="text-xs text-white/70">{t.loginModalSubtitle}</p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
            aria-label={t.cancel}
            title={t.cancel}
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              SteamID64
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <SteamIcon />
              </div>
              <input
                type="text"
                value={steamid64}
                onChange={(event) => setSteamid64(event.target.value)}
                placeholder={t.loginSteamIdPlaceholder}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.loginSecureCodeLabel}
            </label>
            <input
              type="password"
              value={securecode}
              onChange={(event) => setSecurecode(event.target.value)}
              placeholder={t.loginSecureCodePlaceholder}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              required
            />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <label htmlFor="rememberMe" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <ShieldIcon />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t.loginRememberMe}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.loginRememberMeDesc}
              </p>
            </label>
          </div>

          <button
            type="button"
            onClick={handleOpenSecureCodePage}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
          >
            <ExternalLinkIcon />
            <span>{t.loginSecureCodeHelp}</span>
          </button>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !canSubmitSteamLogin(steamid64, securecode)}
            className={`
              w-full py-3.5 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2
              ${isLoading || !canSubmitSteamLogin(steamid64, securecode)
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                {t.loginSubmitting}
              </>
            ) : (
              t.login
            )}
          </button>
        </form>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
            <span>{t.loginSecurityFooter}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
