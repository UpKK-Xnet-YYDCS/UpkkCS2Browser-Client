import { setSteamClient, STEAM_CLIENT_STORAGE_KEY, type SteamClient } from '@/services/steamClient';
import type { Translations } from '@/store/i18n';

export function SteamClientSettingsSection({
  t,
  steamClient,
  setSteamClientState,
}: {
  t: Translations;
  steamClient: SteamClient;
  setSteamClientState: (value: SteamClient) => void;
}) {
  return (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.steamClientSetting}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t.steamClientSettingDesc}</p>
                <div className="flex gap-2 flex-wrap">
                  {(['steam', 'steamchina'] as const).map(option => (
                    <button
                      key={option}
                      onClick={() => {
                        setSteamClientState(option);
                        setSteamClient(option);
                        window.dispatchEvent(new StorageEvent('storage', { key: STEAM_CLIENT_STORAGE_KEY, newValue: option }));
                      }}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                        steamClient === option
                          ? option === 'steam'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                          : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                      }`}
                    >
                      <span>{option === 'steam' ? '🌐' : '🇨🇳'}</span>
                      {option === 'steam' ? t.steamInternational : t.steamChina}
                    </button>
                  ))}
                </div>
                {steamClient === 'steamchina' && (
                  <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                    {t.steamSwitchToChinaWarning}
                  </p>
                )}
              </div>
  );
}
