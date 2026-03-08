import { useAppStore } from '@/store';
import { useI18n } from '@/store/i18n';

// Chevron icons
const ChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];

interface TopPaginationProps {
  overrideCurrentPage?: number;
  overrideTotalPages?: number;
  overrideTotalServers?: number;
  onPageChange?: (page: number) => void;
}

export function TopPagination({ overrideCurrentPage, overrideTotalPages, overrideTotalServers, onPageChange }: TopPaginationProps = {}) {
  const { 
    currentPage: storePage, 
    totalPages: storeTotal, 
    totalServers: storeServers, 
    fetchServers, 
    isLoading,
    perPage,
    setPerPage,
  } = useAppStore();
  const { t } = useI18n();

  const currentPage = overrideCurrentPage ?? storePage;
  const totalPages = overrideTotalPages ?? storeTotal;
  const totalServers = overrideTotalServers ?? storeServers;

  const handlePrev = () => {
    if (currentPage > 1 && !isLoading) {
      if (onPageChange) onPageChange(currentPage - 1);
      else fetchServers(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading) {
      if (onPageChange) onPageChange(currentPage + 1);
      else fetchServers(currentPage + 1);
    }
  };

  const handlePerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPerPage = parseInt(e.target.value, 10);
    setPerPage(newPerPage);
    // Will trigger refetch via useEffect in HomePage
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Server count and per page */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-700 dark:text-gray-200">{totalServers}</span> {t.serversCount}
        </span>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 dark:text-gray-400">{t.perPage}</label>
          <select
            value={perPage}
            onChange={handlePerPageChange}
            className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PER_PAGE_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            第 <span className="font-bold text-blue-600 dark:text-blue-400">{currentPage}</span>/{totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={currentPage === 1 || isLoading}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages || isLoading}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
