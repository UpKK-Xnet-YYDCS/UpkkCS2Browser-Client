import type { ReactNode } from 'react';
import { LogIcon, PaletteIcon } from '@/components/settings/SettingsIcons';
import type { SettingsTab } from '@/hooks/useSettingsPage';
import type { Translations } from '@/store/i18n';

function tabButtonClass(active: boolean, withIcon = false): string {
  return (
    'flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors' +
    (withIcon ? ' flex items-center justify-center gap-1.5 ' : ' ') +
    (active
      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300')
  );
}

function SettingsTabButton({
  active,
  withIcon,
  onClick,
  children,
}: {
  active: boolean;
  withIcon?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button onClick={onClick} className={tabButtonClass(active, withIcon)}>
      {children}
    </button>
  );
}

export function SettingsTabBar({
  activeTab,
  setActiveTab,
  t,
}: {
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
  t: Translations;
}) {
  return (
    <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
      <SettingsTabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')}>
        {t.generalSettings}
      </SettingsTabButton>
      <SettingsTabButton active={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')}>
        {t.appearance}
      </SettingsTabButton>
      <SettingsTabButton active={activeTab === 'colors'} withIcon onClick={() => setActiveTab('colors')}>
        <PaletteIcon />
        {t.colorPalette}
      </SettingsTabButton>
      <SettingsTabButton active={activeTab === 'logs'} withIcon onClick={() => setActiveTab('logs')}>
        <LogIcon />
        {t.operationLog}
      </SettingsTabButton>
    </div>
  );
}
