import {
  FAVORITES_PAGE_SIZE_OPTIONS,
  favoriteVisiblePages,
} from '@/services/favoritesPageQuery';
import type { Translations } from '@/store/i18n';

const pageButtonClass = 'px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors';

export function FavoritePageToolbar({
  t,
  filteredCount,
  searchQuery,
  totalFavorites,
  itemsPerPage,
  handlePageSizeChange,
  totalPages,
  currentPage,
  setCurrentPage,
}: {
  t: Translations;
  filteredCount: number;
  searchQuery: string;
  totalFavorites: number;
  itemsPerPage: number;
  handlePageSizeChange: (size: number) => void;
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <p className="text-sm text-gray-500">
        {t.favorites}: {filteredCount}
        {searchQuery && (' / ' + totalFavorites)}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">{t.itemsPerPage}</span>
          <select
            value={itemsPerPage}
            onChange={e => handlePageSizeChange(Number(e.target.value))}
            className="text-sm px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border-0 text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {FAVORITES_PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className={pageButtonClass}
            >
              ‹
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={pageButtonClass}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function FavoritePagination({
  totalPages,
  currentPage,
  setCurrentPage,
}: {
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        onClick={() => setCurrentPage(1)}
        disabled={currentPage <= 1}
        className={pageButtonClass}
      >
        «
      </button>
      <button
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage <= 1}
        className={pageButtonClass}
      >
        ‹
      </button>
      {favoriteVisiblePages(currentPage, totalPages).map(page => (
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          className={'px-3 py-1.5 rounded-lg text-sm transition-colors ' + (
            page === currentPage
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        disabled={currentPage >= totalPages}
        className={pageButtonClass}
      >
        ›
      </button>
      <button
        onClick={() => setCurrentPage(totalPages)}
        disabled={currentPage >= totalPages}
        className={pageButtonClass}
      >
        »
      </button>
    </div>
  );
}

