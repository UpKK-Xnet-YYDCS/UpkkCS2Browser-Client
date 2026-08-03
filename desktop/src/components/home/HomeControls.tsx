import { useEffect, useRef, useState } from 'react';
import {
  CARD_MIN_WIDTH_DEFAULT,
  CARD_MIN_WIDTH_MAX,
  CARD_MIN_WIDTH_MIN,
  CARD_MIN_WIDTH_STEP,
} from '@/store';
import { useI18n } from '@/hooks/useI18n';
import { parseServerAddress, queryServerA2S } from '@/services/a2s';

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

// Countdown Progress Bar Component
interface CountdownProgressBarProps {
  secondsRemaining: number;
  totalSeconds: number;
  isLoading?: boolean;
}

const CountdownProgressBar = ({ secondsRemaining, totalSeconds, isLoading }: CountdownProgressBarProps) => {
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800/50 min-w-[120px]">
      <div className="flex-1 relative">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              isLoading 
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse w-full' 
                : 'bg-gradient-to-r from-purple-500 to-blue-500'
            }`}
            style={{ width: isLoading ? '100%' : `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-medium text-purple-600 dark:text-purple-400 min-w-[28px] text-right tabular-nums">
        {isLoading ? '...' : `${secondsRemaining}s`}
      </span>
    </div>
  );
};

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

// Default game server port
const DEFAULT_LOCAL_SERVER_PORT = '27015';
// Maximum visible game tags before showing expand button
const MAX_VISIBLE_GAME_TAGS = 6;

// Add Local Server Modal
function AddLocalServerModal({ onClose, onAdded }: { onClose: () => void; onAdded: (addr: string) => void }) {
  const { t } = useI18n();
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = address.trim();
    if (!trimmed) return;

    const parsed = parseServerAddress(trimmed.includes(':') ? trimmed : `${trimmed}:${DEFAULT_LOCAL_SERVER_PORT}`);
    if (!parsed) {
      setError(t.invalidAddressFormat);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Query A2S to validate the server is reachable
      const result = await queryServerA2S(parsed.ip, parsed.port);
      if (!result.success) {
        setError(result.error || 'Failed to query server');
        return;
      }

      const addr = `${parsed.ip}:${parsed.port}`;
      onAdded(addr);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t.addLocalServer}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-green-100 text-sm mt-1">{t.addLocalServerDesc}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.serverAddress}</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="192.168.1.1:27015 / example.com:27015"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 outline-none transition-all"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!address.trim() || isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? '...' : t.addLocalServer}
            </button>
            <button onClick={onClose} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium rounded-xl transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export {
  AddLocalServerModal,
  AutoRefreshCountdown,
  CardSizeControl,
  MAX_VISIBLE_GAME_TAGS,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
};
