import { useEffect, useRef, useState } from 'react';
import { Cloud, LogIn, LogOut } from 'lucide-react';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { useI18n } from '@/hooks/useI18n';
import type { CloudLoginProvider } from '@/contexts/cloudAuthContext';

export function CloudUserStatusButton() {
  const { authStatus, isLoggedIn, isReady, loginPending, login, logout } = useCloudAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const chooseProvider = (provider: CloudLoginProvider) => {
    setOpen(false);
    void login(provider);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={!isReady || loginPending}
        className="h-9 max-w-36 flex items-center gap-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        title={isLoggedIn ? authStatus.user?.username : t.loginChooseProvider}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Cloud className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium truncate hidden lg:block">
          {isLoggedIn ? authStatus.user?.username || t.cloudFavorites : t.login}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1.5 shadow-xl" role="menu">
          {isLoggedIn ? (
            <button type="button" onClick={() => { setOpen(false); void logout(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40" role="menuitem">
              <LogOut className="w-4 h-4" aria-hidden="true" />
              {t.logout}
            </button>
          ) : (
            (['steam', 'upkk', 'google', 'discord'] as const).map((provider) => (
              <button key={provider} type="button" onClick={() => chooseProvider(provider)} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem">
                <LogIn className="w-4 h-4" aria-hidden="true" />
                {provider === 'steam' ? t.loginWithSteam : provider === 'upkk' ? t.loginWithUpkk : provider === 'google' ? t.loginWithGoogle : t.loginWithDiscord}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
