import { truncateFavoriteGameLabel } from '@/services/homeFavoriteFilters';
import type { Translations } from '@/store/i18n';

const MAX_VISIBLE_GAME_TAGS = 6;

export interface HomeFavoriteGameTagsProps {
  t: Translations;
  favGameNames: Array<{ name: string; count: number }>;
  favGameFilter: string;
  setFavGameFilter: (value: string) => void;
  showAllGameTags: boolean;
  setShowAllGameTags: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export function HomeFavoriteGameTags({
  t,
  favGameNames,
  favGameFilter,
  setFavGameFilter,
  showAllGameTags,
  setShowAllGameTags,
}: HomeFavoriteGameTagsProps) {
  if (favGameNames.length <= 1) return null;

  return (
    <div className="relative">
      <div className={`flex items-center gap-2 flex-wrap pb-1 ${!showAllGameTags ? 'max-h-[4.5rem] overflow-hidden' : ''}`}>
        <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <button
          onClick={() => setFavGameFilter('')}
          className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
            favGameFilter === ''
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t.allGames}
        </button>
        {favGameNames.map(({ name, count }) => (
            <button
              key={name}
              onClick={() => setFavGameFilter(name)}
              title={name}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                favGameFilter === name
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {truncateFavoriteGameLabel(name)}({count})
            </button>
        ))}
      </div>
      {favGameNames.length > MAX_VISIBLE_GAME_TAGS && (
        <button
          onClick={() => setShowAllGameTags(!showAllGameTags)}
          className="mt-1 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          {showAllGameTags ? '▲ ' + (t.collapse || '收起') : '▼ ' + (t.expand || '展开') + ` (${favGameNames.length})`}
        </button>
      )}
    </div>
  );
}
