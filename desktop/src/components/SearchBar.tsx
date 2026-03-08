import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import { useI18n } from '@/store/i18n';

// Simple inline SVG icons
const SearchIcon = () => (
  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useAppStore();
  const { t } = useI18n();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [isFocused, setIsFocused] = useState(false);

  // Sync local query with store query (for external changes)
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Debounce search - only update store query, HomePage handles fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== searchQuery) {
        setSearchQuery(localQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, searchQuery, setSearchQuery]);

  const handleClear = useCallback(() => {
    setLocalQuery('');
    setSearchQuery('');
  }, [setSearchQuery]);

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <SearchIcon />
      </div>
      <input
        type="text"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={t.searchPlaceholder}
        className={`
          block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm
          bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm
          border-2 transition-all duration-200
          text-gray-900 dark:text-white placeholder-gray-400
          ${isFocused 
            ? 'border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-800 ring-4 ring-blue-500/20' 
            : 'border-transparent hover:bg-gray-200/80 dark:hover:bg-gray-700/80'
          }
        `}
      />
      {localQuery && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
}
