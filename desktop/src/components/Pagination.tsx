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

interface PaginationProps {
  overrideCurrentPage?: number;
  overrideTotalPages?: number;
  overrideTotalServers?: number;
  onPageChange?: (page: number) => void;
}

export function Pagination({ overrideCurrentPage, overrideTotalPages, overrideTotalServers, onPageChange }: PaginationProps = {}) {
  const { currentPage: storePage, totalPages: storeTotal, totalServers: storeServers, fetchServers, isLoading } = useAppStore();
  const { t } = useI18n();

  const currentPage = overrideCurrentPage ?? storePage;
  const totalPages = overrideTotalPages ?? storeTotal;
  const totalServers = overrideTotalServers ?? storeServers;

  if (totalPages <= 1) return null;

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

  const handlePage = (page: number) => {
    if (page !== currentPage && !isLoading) {
      if (onPageChange) onPageChange(page);
      else fetchServers(page);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-between py-6">
      <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
        <span className="font-bold text-gray-700 dark:text-gray-200">{totalServers}</span> {t.serversCount},
        {t.page} <span className="font-bold text-blue-600 dark:text-blue-400">{currentPage}</span>/{totalPages}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1 || isLoading}
          className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <ChevronLeft />
        </button>
        
        {getPageNumbers().map((page, idx) => (
          typeof page === 'number' ? (
            <button
              key={idx}
              onClick={() => handlePage(page)}
              disabled={isLoading}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                ${page === currentPage
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              {page}
            </button>
          ) : (
            <span key={idx} className="px-2 text-gray-400">•••</span>
          )
        ))}
        
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || isLoading}
          className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
