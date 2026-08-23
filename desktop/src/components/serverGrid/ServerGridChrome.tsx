import type { ReactNode } from 'react';

const closeIconPath = 'M6 18L18 6M6 6l12 12';
const warningIconPath = 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
const moveUpPath = 'M5 15l7-7 7 7';
const moveDownPath = 'M19 9l-7 7-7-7';

function StrokeIcon({ className, d }: { className: string; d: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

export function ServerGridShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {children}
      </div>
    </div>
  );
}

export function ServerGridErrorBanner({
  message,
  onDismiss,
  showIcon = false,
  dismissClassName = 'text-red-500 hover:text-red-700 p-1',
}: {
  message: string;
  onDismiss: () => void;
  showIcon?: boolean;
  dismissClassName?: string;
}) {
  const text = <p className="text-red-700 dark:text-red-400">{message}</p>;
  return (
    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
      <div className="flex items-center justify-between">
        {showIcon ? (
          <div className="flex items-center gap-3">
            <StrokeIcon className="w-5 h-5 text-red-500" d={warningIconPath} />
            {text}
          </div>
        ) : text}
        <button onClick={onDismiss} className={dismissClassName}>
          <StrokeIcon className="w-5 h-5" d={closeIconPath} />
        </button>
      </div>
    </div>
  );
}

export function ServerGridEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        {children}
      </div>
    </div>
  );
}

export function ServerGridLoadingOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] flex items-start justify-center pt-20 z-10 rounded-xl transition-opacity">
      <div className="flex flex-col items-center gap-3 bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 border-3 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{label}</span>
      </div>
    </div>
  );
}

export function ServerReorderControls({
  variant,
  onReorder,
  canMoveUp,
  canMoveDown,
  moveUpTitle,
  moveDownTitle,
}: {
  variant: 'card' | 'list';
  onReorder: (direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  moveUpTitle: string;
  moveDownTitle: string;
}) {
  const isCard = variant === 'card';
  const buttonClass = isCard
    ? 'p-1 rounded-md bg-black/50 text-white/80 hover:bg-black/70 hover:text-white disabled:opacity-30 backdrop-blur-sm transition-all'
    : 'p-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-all';
  return (
    <div
      className={isCard
        ? 'absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10'
        : 'absolute top-1/2 -translate-y-1/2 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10'}
    >
      <button
        onClick={(event) => { event.stopPropagation(); onReorder('up'); }}
        disabled={!canMoveUp}
        className={buttonClass}
        title={moveUpTitle}
      >
        <StrokeIcon className="w-3.5 h-3.5" d={moveUpPath} />
      </button>
      <button
        onClick={(event) => { event.stopPropagation(); onReorder('down'); }}
        disabled={!canMoveDown}
        className={buttonClass}
        title={moveDownTitle}
      >
        <StrokeIcon className="w-3.5 h-3.5" d={moveDownPath} />
      </button>
    </div>
  );
}
