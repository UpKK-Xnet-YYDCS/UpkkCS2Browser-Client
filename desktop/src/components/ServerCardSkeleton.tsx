/**
 * Skeleton loading component for ServerCard
 * Shows an animated placeholder while servers are loading
 */

// Add shimmer keyframes to document
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-shimmer-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @keyframes skeleton-loading {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
      .skeleton-shimmer {
        position: relative;
        overflow: hidden;
      }
      .skeleton-shimmer::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }
    `;
    document.head.appendChild(style);
  }
}

export function ServerCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Map Preview Banner Skeleton */}
      <div className="h-32 relative overflow-hidden bg-gray-300 dark:bg-gray-600 skeleton-shimmer">
        {/* Map name placeholder */}
        <div className="absolute bottom-2 left-2">
          <div className="h-4 w-24 bg-white/20 rounded animate-pulse" />
        </div>
        {/* Player count placeholder */}
        <div className="absolute bottom-2 right-2">
          <div className="h-6 w-16 bg-white/20 rounded-full animate-pulse" />
        </div>
      </div>
      
      {/* Card Content Skeleton */}
      <div className="p-4">
        {/* Server Name */}
        <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3 animate-pulse" />
        
        {/* Server Details Row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '0.1s' }} />
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
        </div>
        
        {/* Tags */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
          <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ animationDelay: '0.1s' }} />
          <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for list view item
 */
export function ServerListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Map image */}
      <div className="w-16 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg skeleton-shimmer" />
      
      {/* Server info */}
      <div className="flex-1 min-w-0">
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: '0.1s' }} />
      </div>
      
      {/* Player count */}
      <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ animationDelay: '0.1s' }} />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  );
}

/**
 * Loading overlay that shows on top of existing content during refresh
 */
export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Loading...</span>
      </div>
    </div>
  );
}

export default ServerCardSkeleton;
