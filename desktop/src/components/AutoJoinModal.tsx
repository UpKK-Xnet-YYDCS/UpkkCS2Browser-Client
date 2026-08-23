import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ServerStatus } from '@/types';
import { useI18n } from '@/hooks/useI18n';
import { useAutoJoinMonitor } from '@/hooks/useAutoJoinMonitor';
import {
  AUTO_JOIN_MAX_INTERVAL,
  AUTO_JOIN_MIN_INTERVAL,
  autoJoinTriggerThreshold,
} from '@/services/autoJoinPolicy';
import { AutoJoinCheckCircleIcon, AutoJoinCloseIcon, AutoJoinSpinnerIcon } from './autoJoinIcons';

interface AutoJoinModalProps {
  server: ServerStatus;
  onClose: () => void;
  autoStart?: boolean;
}

export function AutoJoinModal({ server, onClose, autoStart = false }: AutoJoinModalProps) {
  const { t } = useI18n();
  const {
    serverName,
    minSlots,
    checkInterval,
    isMonitoring,
    countdown,
    statusText,
    currentPlayers,
    currentMaxPlayers,
    availableSlots,
    handleToggle,
    handleMinSlotsChange,
    handleCheckIntervalChange,
  } = useAutoJoinMonitor({ server, t, onClose, autoStart });

  const triggerThreshold = autoJoinTriggerThreshold(currentMaxPlayers, minSlots);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Modal content - uses high z-index and pointer-events to ensure proper interaction
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999, pointerEvents: 'auto' }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{ pointerEvents: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <AutoJoinCheckCircleIcon />
              <div>
                <h2 className="text-lg font-bold">{t.autoJoinTitle}</h2>
                <p className="text-cyan-100 text-sm mt-1 truncate max-w-[250px]">{serverName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <AutoJoinCloseIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status panel (shown when monitoring) */}
          {isMonitoring && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-3">
                <AutoJoinSpinnerIcon />
                <span className="text-blue-700 dark:text-blue-400 font-medium">{statusText || t.autoJoinMonitoring}</span>
              </div>
              <div className="flex justify-between text-sm text-blue-600 dark:text-blue-300">
                <span>{t.autoJoinCurrentPlayers}: {currentPlayers}/{currentMaxPlayers} ({t.autoJoinRemaining} {availableSlots})</span>
                <span>{t.autoJoinNextCheck}: {countdown}{t.autoJoinSeconds}</span>
              </div>
            </div>
          )}

          {/* Settings panel (shown when not monitoring) */}
          {!isMonitoring && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-gray-700 dark:text-gray-300 font-medium">
                  {t.autoJoinMinSlots}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={minSlots}
                    onChange={handleMinSlotsChange}
                    className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <span className="text-gray-500 dark:text-gray-400">{t.autoJoinSlots}</span>
                </div>
              </div>
              
              {/* Check interval setting - allow users to adjust monitoring interval */}
              <div className="flex items-center justify-between mb-4">
                <label className="text-gray-700 dark:text-gray-300 font-medium">
                  {t.autoJoinCheckInterval}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={AUTO_JOIN_MIN_INTERVAL}
                    max={AUTO_JOIN_MAX_INTERVAL}
                    step={1}
                    value={checkInterval}
                    onChange={handleCheckIntervalChange}
                    className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <span className="text-gray-500 dark:text-gray-400">{t.autoJoinSeconds}</span>
                </div>
              </div>
              
              {/* Preview */}
              <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
                <p className="text-sm text-cyan-800 dark:text-cyan-300">
                  💡 <strong>{t.autoJoinTrigger}:</strong> {t.autoJoinTriggerDesc} <strong>{currentMaxPlayers}</strong> - <strong>{minSlots}</strong> = <strong>{triggerThreshold >= 0 ? triggerThreshold : 0}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleToggle}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-xl transition-all shadow-lg hover:shadow-xl ${
                isMonitoring
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'
              }`}
            >
              {isMonitoring ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t.autoJoinStop}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {t.autoJoinStart}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium rounded-xl transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  // This prevents flickering caused by parent component re-renders
  return createPortal(modalContent, document.body);
}
