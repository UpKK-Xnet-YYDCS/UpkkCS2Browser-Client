interface MapHistoryPaginationProps {
  page: number;
  totalPages: number;
  prevLabel: string;
  nextLabel: string;
  onPageChange: (updater: (page: number) => number) => void;
}

export function MapHistoryPagination({
  page,
  totalPages,
  prevLabel,
  nextLabel,
  onPageChange,
}: MapHistoryPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPageChange((current) => Math.max(1, current - 1))}
        disabled={page === 1}
        className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        {prevLabel}
      </button>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange((current) => Math.min(totalPages, current + 1))}
        disabled={page === totalPages}
        className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        {nextLabel}
      </button>
    </div>
  );
}
