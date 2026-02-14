import { useEffect } from 'react';
import { useAppStore } from '@/store';

// Tag icon
const TagIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

export function CategoryFilter() {
  const { 
    categories, 
    selectedCategory, 
    setSelectedCategory, 
    fetchCategories,
  } = useAppStore();

  // Load categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Only update the state - HomePage's useEffect will trigger fetchServers
  // This avoids race conditions and duplicate fetch calls
  const handleCategoryChange = (categoryName: string | null) => {
    setSelectedCategory(categoryName);
  };

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <TagIcon />
      <button
        onClick={() => handleCategoryChange(null)}
        className={`
          whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
          ${selectedCategory === null
            ? 'bg-blue-500 text-white shadow-md'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }
        `}
      >
        全部
      </button>
      {categories.map((categoryName) => (
        <button
          key={categoryName}
          onClick={() => handleCategoryChange(categoryName)}
          className={`
            whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
            ${selectedCategory === categoryName
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
        >
          {categoryName}
        </button>
      ))}
    </div>
  );
}
