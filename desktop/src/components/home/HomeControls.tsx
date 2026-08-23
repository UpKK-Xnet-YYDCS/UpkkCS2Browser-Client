import { useEffect, useRef, useState } from 'react';
import { CountdownProgressBar } from '@/components/CountdownProgressBar';
import {
  CARD_MIN_WIDTH_DEFAULT,
  CARD_MIN_WIDTH_MAX,
  CARD_MIN_WIDTH_MIN,
  CARD_MIN_WIDTH_STEP,
} from '@/store/appState';
import { useI18n } from '@/hooks/useI18n';

// Refresh icon
const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg 
    className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Add server icon
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

interface AutoRefreshCountdownProps {
  interval: number;
  isLoading: boolean;
  onRefresh: () => void;
}

function AutoRefreshCountdown({ interval, isLoading, onRefresh }: AutoRefreshCountdownProps) {
  const [remaining, setRemaining] = useState(interval);
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (interval <= 0) return undefined;
    const timer = window.setInterval(() => {
      setRemaining(current => {
        if (current <= 1) {
          refreshRef.current();
          return interval;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [interval]);

  return <CountdownProgressBar secondsRemaining={remaining} totalSeconds={interval} isLoading={isLoading} />;
}

interface CardSizeControlProps {
  value: number;
  onChange: (value: number) => void;
}

const CardSizeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2M4 16v2a2 2 0 002 2h2m8 0h2a2 2 0 002-2v-2M9 12h6" />
  </svg>
);

function CardSizeControl({ value, onChange }: CardSizeControlProps) {
  const { t } = useI18n();
  const resetToDefault = () => onChange(CARD_MIN_WIDTH_DEFAULT);

  return (
    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
      <CardSizeIcon />
      <label htmlFor="server-card-size" className="text-xs font-medium whitespace-nowrap">
        {t.cardSize}
      </label>
      <input
        id="server-card-size"
        type="range"
        min={CARD_MIN_WIDTH_MIN}
        max={CARD_MIN_WIDTH_MAX}
        step={CARD_MIN_WIDTH_STEP}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-24 h-1.5 accent-blue-500 cursor-pointer"
        aria-label={t.cardSize}
      />
      <button
        type="button"
        onClick={resetToDefault}
        className="min-w-10 text-right text-xs tabular-nums hover:text-blue-600 dark:hover:text-blue-400"
        title={t.resetCardSize}
      >
        {value}px
      </button>
    </div>
  );
}

// Search icon for local favorites
const SearchIcon = () => (
  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export {
  AutoRefreshCountdown,
  CardSizeControl,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
};
