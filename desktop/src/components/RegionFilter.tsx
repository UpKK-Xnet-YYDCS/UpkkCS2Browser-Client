import type { ReactNode } from 'react';
import { useAppStore } from '@/store';
import { useI18n } from '@/store/i18n';
import type { ServerRegion } from '@/types';

type RegionConfig = { value: ServerRegion; labelKey: 'regionAll' | 'regionChina' | 'regionInternational'; icon: ReactNode };

const regionConfigs: RegionConfig[] = [
  { 
    value: 'all', 
    labelKey: 'regionAll',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    value: 'cn', 
    labelKey: 'regionChina',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    )
  },
  { 
    value: 'global', 
    labelKey: 'regionInternational',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    )
  },
];

export function RegionFilter() {
  const { selectedRegion, setSelectedRegion } = useAppStore();
  const { t } = useI18n();

  const handleChange = (region: ServerRegion) => {
    setSelectedRegion(region);
    // useEffect in HomePage handles fetchServers with correct state
  };

  return (
    <div className="flex gap-1.5 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm p-1 rounded-xl">
      {regionConfigs.map(({ value, labelKey, icon }) => (
        <button
          key={value}
          onClick={() => handleChange(value)}
          className={`
            flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
            ${selectedRegion === value
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }
          `}
        >
          {icon}
          {t[labelKey]}
        </button>
      ))}
    </div>
  );
}
