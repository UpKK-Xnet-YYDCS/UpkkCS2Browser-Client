import {
  DiscordLoginIcon,
  GoogleLoginIcon,
  SteamLoginIcon,
  UpkkLoginIcon,
  XMarkIcon,
} from '@/components/monitor/MonitorIcons';
import type { Translations } from '@/store/i18n';
import type { CloudLoginProvider } from '@/types/cloudAuth';

interface MonitorLoginSuggestionProps {
  t: Translations;
  loginPending: boolean;
  onLogin: (provider: CloudLoginProvider) => void;
  onDismiss: () => void;
}

export function MonitorLoginSuggestion({ t, loginPending, onLogin, onDismiss }: MonitorLoginSuggestionProps) {
  return (
    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl flex items-start gap-3">
      <span className="text-2xl mt-0.5">💡</span>
      <div className="flex-1">
        <h3 className="font-semibold text-amber-800 dark:text-amber-200">{t.monitorLoginSuggested}</h3>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{t.monitorLoginSuggestedDesc}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => onLogin('steam')}
            disabled={loginPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{ backgroundColor: '#171a21' }}
          >
            <SteamLoginIcon />
            <span>{loginPending ? '...' : t.loginWithSteam}</span>
          </button>
          <button
            onClick={() => onLogin('upkk')}
            disabled={loginPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{ backgroundColor: '#e74c3c' }}
          >
            <UpkkLoginIcon />
            <span>{loginPending ? '...' : t.loginWithUpkk}</span>
          </button>
          <button
            onClick={() => onLogin('google')}
            disabled={loginPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:hover:scale-100"
          >
            <GoogleLoginIcon />
            <span>{loginPending ? '...' : t.loginWithGoogle}</span>
          </button>
          <button
            onClick={() => onLogin('discord')}
            disabled={loginPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{ backgroundColor: '#5865F2' }}
          >
            <DiscordLoginIcon />
            <span>{loginPending ? '...' : t.loginWithDiscord}</span>
          </button>
        </div>
        {loginPending && (
          <p className="text-sm text-blue-500 mt-2 animate-pulse">
            ⏳ {t.syncFavoritesHint}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors p-1"
      >
        <XMarkIcon />
      </button>
    </div>
  );
}

