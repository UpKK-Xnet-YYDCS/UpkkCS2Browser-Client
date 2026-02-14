import type { ReactNode } from 'react';
import { useAppStore } from '@/store';
import { useI18n } from '@/store/i18n';
import type { GameType } from '@/types';

// CS2 Icon - Modern geometric design
const CS2Icon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5l7 3.5v7l-7 3.5-7-3.5v-7l7-3.5z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

// CSGO Icon - Classic crosshair
const CSGOIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
);

// All Games Icon
const AllGamesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

export function GameTypeFilter() {
  const { selectedGameType, setSelectedGameType } = useAppStore();
  const { t } = useI18n();

  const gameTypes: { value: GameType; label: string; icon: ReactNode; color: string; activeColor: string }[] = [
    { 
      value: 'cs2', 
      label: t.gameCs2,
      icon: <CS2Icon />,
      color: 'from-orange-500 to-red-500',
      activeColor: 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30',
    },
    { 
      value: 'csgo', 
      label: t.gameCsgo,
      icon: <CSGOIcon />,
      color: 'from-yellow-500 to-orange-500',
      activeColor: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/30',
    },
    { 
      value: 'all', 
      label: t.gameAll,
      icon: <AllGamesIcon />,
      color: 'from-blue-500 to-purple-500',
      activeColor: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30',
    },
  ];

  // Only update the state - HomePage's useEffect will trigger fetchServers
  // This avoids race conditions where fetchServers uses stale state
  const handleChange = (gameType: GameType) => {
    setSelectedGameType(gameType);
  };

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
      {gameTypes.map(({ value, label, icon, activeColor }) => (
        <button
          key={value}
          onClick={() => handleChange(value)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg transition-all duration-200
            ${selectedGameType === value
              ? activeColor
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
            }
          `}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
