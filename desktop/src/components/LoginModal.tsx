import { useState } from 'react';
import { useUserStore } from '@/store/user';

// Icons
const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const SteamIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5l2.82-1.47c.4-.2.86-.2 1.26 0l2.82 1.47C19.13 20.17 22 16.42 22 12A10 10 0 0 0 12 2zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 14c-2.67 0-5.02-1.35-6.41-3.4l2.41-1.26a4 4 0 0 0 8 0l2.41 1.26A7.98 7.98 0 0 1 12 19z"/>
  </svg>
);

const LoadingSpinner = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const SECURE_CODE_URL = 'https://bbs.upkk.com/plugin.php?id=xnet_steam_openid:SoftLogin_getsecurecode';

export function LoginModal() {
  const { showLoginModal, closeLoginModal, login, isLoading, error, rememberMe, setRememberMe } = useUserStore();
  const [steamid64, setSteamid64] = useState('');
  const [securecode, setSecurecode] = useState('');

  if (!showLoginModal) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!steamid64.trim() || !securecode.trim()) {
      return;
    }
    await login(steamid64.trim(), securecode.trim(), rememberMe);
  };

  const handleOpenSecureCodePage = async () => {
    try {
      // Always use shell:open to open in system default browser (not built-in webview)
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(SECURE_CODE_URL);
    } catch {
      // Fallback for non-Tauri environment (web browser)
      window.open(SECURE_CODE_URL, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
              <UserIcon />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">用户登录</h2>
              <p className="text-xs text-white/70">使用 SteamID64 和安全码登录</p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* SteamID64 Input */}
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
                onChange={(e) => setSteamid64(e.target.value)}
                placeholder="输入您的 SteamID64"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Secure Code Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              安全码
            </label>
            <input
              type="password"
              value={securecode}
              onChange={(e) => setSecurecode(e.target.value)}
              placeholder="输入您的安全码"
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              required
            />
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <label htmlFor="rememberMe" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <ShieldIcon />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  记住登录信息
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                使用设备绑定加密存储，下次启动自动登录
              </p>
            </label>
          </div>

          {/* Help Link */}
          <button
            type="button"
            onClick={handleOpenSecureCodePage}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
          >
            <ExternalLinkIcon />
            <span>点击这里获取 SteamID64 和安全码</span>
          </button>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !steamid64.trim() || !securecode.trim()}
            className={`
              w-full py-3.5 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2
              ${isLoading || !steamid64.trim() || !securecode.trim()
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                登录中...
              </>
            ) : (
              '登录'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
            </svg>
            <span>安全登录 · AES-256加密 · 设备绑定保护</span>
          </div>
        </div>
      </div>
    </div>
  );
}
