import type { ReactNode } from 'react';
import { useI18n } from '@/hooks/useI18n';
import type { Translations } from '@/store/i18n';
import type { TabId } from '@/hooks/useTabNavigation';
import { useNavigationLabelMode } from '@/hooks/useNavigationLabelMode';

type TabLabelKey = keyof Pick<Translations, 'tabServers' | 'tabAi' | 'tabFavorites' | 'tabMonitor' | 'tabForum' | 'tabCheckIn' | 'tabSettings'>;

interface Tab {
  id: TabId;
  labelKey: TabLabelKey;
  icon: ReactNode;
}

const ServerIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const FavoritesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const ForumIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8zM7 8V6a2 2 0 012-2h8a2 2 0 012 2v2" />
  </svg>
);

const CheckInIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const MonitorIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const BotIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 14h2" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 14h2" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13v2" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13v2" />
  </svg>
);

const tabs: Tab[] = [
  { id: 'servers', labelKey: 'tabServers', icon: <ServerIcon /> },
  { id: 'favorites', labelKey: 'tabFavorites', icon: <FavoritesIcon /> },
  { id: 'monitor', labelKey: 'tabMonitor', icon: <MonitorIcon /> },
  { id: 'forum', labelKey: 'tabForum', icon: <ForumIcon /> },
  { id: 'checkin', labelKey: 'tabCheckIn', icon: <CheckInIcon /> },
  { id: 'ai', labelKey: 'tabAi', icon: <BotIcon /> },
  { id: 'settings', labelKey: 'tabSettings', icon: <SettingsIcon /> },
];

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { t } = useI18n();
  const { mode } = useNavigationLabelMode();
  const showLabels = mode === 'labels';
  
  return (
    <nav className="flex max-w-full min-w-0 items-center gap-1 overflow-x-auto bg-gray-100/80 p-1 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg" aria-label="Primary">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          title={t[tab.labelKey]}
          aria-label={t[tab.labelKey]}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          className={`
            h-9 shrink-0 flex items-center justify-center rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500
            ${showLabels ? 'gap-2 px-3' : 'w-9 px-0'}
            ${activeTab === tab.id
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }
          `}
        >
          {tab.icon}
          {showLabels && <span>{t[tab.labelKey]}</span>}
        </button>
      ))}
    </nav>
  );
}
