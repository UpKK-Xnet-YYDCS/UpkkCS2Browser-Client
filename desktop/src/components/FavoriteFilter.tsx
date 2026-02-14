import { useAppStore } from '@/store';

// Star icon
const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-4 h-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

interface FavoriteFilterProps {
  showFavoritesOnly: boolean;
  onToggle: (value: boolean) => void;
  favoriteCount: number;
}

export function FavoriteFilter({ showFavoritesOnly, onToggle, favoriteCount }: FavoriteFilterProps) {
  const { favorites } = useAppStore();
  
  return (
    <button
      onClick={() => onToggle(!showFavoritesOnly)}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
        ${showFavoritesOnly
          ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }
      `}
    >
      <StarIcon filled={showFavoritesOnly || favoriteCount > 0} />
      <span>本地收藏</span>
      {favorites.length > 0 && (
        <span className={`
          px-1.5 py-0.5 rounded text-xs
          ${showFavoritesOnly 
            ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200' 
            : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
          }
        `}>
          {favorites.length}
        </span>
      )}
    </button>
  );
}
