import { useI18n } from '@/hooks/useI18n';

interface ServerDetailInfoSectionProps {
  serverMap: string;
  serverPlayers: number;
  serverMaxPlayers: number;
  serverBots: number;
  serverGame: string;
  serverCategory: string;
  serverCountry: string;
  serverVersion: string;
  serverVac: boolean;
  password?: boolean;
  playerPercent: number;
}

export function ServerDetailInfoSection({
  serverMap,
  serverPlayers,
  serverMaxPlayers,
  serverBots,
  serverGame,
  serverCategory,
  serverCountry,
  serverVersion,
  serverVac,
  password,
  playerPercent,
}: ServerDetailInfoSectionProps) {
  const { t } = useI18n();
  const loadClass = playerPercent >= 80
    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
    : playerPercent >= 50
      ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
      : playerPercent > 0
        ? 'bg-gradient-to-r from-blue-400 to-cyan-500'
        : 'bg-gray-300 dark:bg-gray-600';

  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailMap}</div>
          <div className="font-semibold text-gray-900 dark:text-white">{serverMap}</div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailPlayers}</div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {serverPlayers}/{serverMaxPlayers}
            {serverBots > 0 && <span className="text-gray-400 text-sm ml-1">(+{serverBots} bot)</span>}
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailGame}</div>
          <div className="font-semibold text-gray-900 dark:text-white">{serverGame || 'N/A'}</div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailCategory}</div>
          <div className="font-semibold text-gray-900 dark:text-white">{serverCategory || 'N/A'}</div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailCountry}</div>
          <div className="font-semibold text-gray-900 dark:text-white">{serverCountry || 'Unknown'}</div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.serverDetailVersion}</div>
          <div className="font-semibold text-gray-900 dark:text-white">{serverVersion || 'N/A'}</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t.serverDetailLoad}</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{playerPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={'h-3 rounded-full transition-all duration-500 ' + loadClass}
            style={{ width: playerPercent + '%' }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {serverVac && (
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-lg">
            {t.serverDetailVac}
          </span>
        )}
        {password && (
          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-bold rounded-lg">
            {t.serverDetailPassword}
          </span>
        )}
      </div>
    </>
  );
}
