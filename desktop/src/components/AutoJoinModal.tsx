import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ServerStatus } from '@/types';
import { refreshServer } from '@/api';
import { buildJoinUrl } from './SteamClientSwitch';
import { useI18n } from '@/store/i18n';
import { isTauriAvailable, queryServerA2S } from '@/services/a2s';

interface AutoJoinModalProps {
  server: ServerStatus;
  onClose: () => void;
}

// Icons
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const SpinnerIcon = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
);

// Local A2S icon (shows when using local UDP query)
const LocalQueryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

// Auto-join check interval in seconds
const DEFAULT_CHECK_INTERVAL = 7; // default 7 seconds
const MIN_CHECK_INTERVAL = 2; // minimum 2 seconds for local A2S
const MAX_CHECK_INTERVAL = 300; // maximum 300 seconds (5 minutes)
// Default max players for CS2/CSGO servers
const DEFAULT_MAX_PLAYERS = 64;

export function AutoJoinModal({ server, onClose }: AutoJoinModalProps) {
  const { t } = useI18n();
  
  // Get server data with fallbacks for API format differences
  const serverIp = server.ip || server.Addr || '';
  const serverPort = server.port || server.Port || '';
  const serverName = server.name || server.Name || 'Unknown Server';
  const serverMaxPlayers = server.max_players ?? server.MaxPlayers ?? DEFAULT_MAX_PLAYERS;
  
  // State
  const [minSlots, setMinSlots] = useState(() => {
    const saved = localStorage.getItem('autoJoinMinSlots');
    return saved ? parseInt(saved, 10) : 4;
  });
  const [checkInterval, setCheckInterval] = useState(() => {
    const saved = localStorage.getItem('autoJoinCheckInterval');
    return saved ? parseInt(saved, 10) : DEFAULT_CHECK_INTERVAL;
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [countdown, setCountdown] = useState(DEFAULT_CHECK_INTERVAL);
  const [statusText, setStatusText] = useState('');
  const [currentPlayers, setCurrentPlayers] = useState(server.players ?? server.Players ?? 0);
  const [useLocalA2S, setUseLocalA2S] = useState(false); // Track if using local A2S
  const [currentMaxPlayers, setCurrentMaxPlayers] = useState(serverMaxPlayers);
  
  // Refs for intervals
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMonitoringRef = useRef(false);

  // Update ref when state changes
  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);

  // Stop monitoring function (defined as inline to avoid circular dependency)
  const doStopMonitoring = () => {
    setIsMonitoring(false);
    setStatusText('');
    
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Calculate trigger threshold
  const triggerThreshold = currentMaxPlayers - minSlots;

  // Check server and join if slots available
  // Uses local A2S query (Tauri) when available, falls back to API
  const checkServer = useCallback(async () => {
    if (!isMonitoringRef.current) return;

    setStatusText(t.autoJoinChecking);
    
    let realPlayers = 0;
    let maxPlayers = DEFAULT_MAX_PLAYERS;
    let querySuccess = false;
    
    try {
      // Try local A2S query first (Tauri only - direct UDP query)
      if (isTauriAvailable()) {
        const a2sResult = await queryServerA2S(String(serverIp), String(serverPort));
        
        if (a2sResult && a2sResult.success) {
          realPlayers = a2sResult.real_players;
          maxPlayers = a2sResult.max_players;
          querySuccess = true;
          setUseLocalA2S(true);
          console.log('[AutoJoin] Using local A2S query:', { realPlayers, maxPlayers });
        }
      }
      
      // Fallback to API query if A2S failed or not in Tauri
      if (!querySuccess) {
        const serverId = `${serverIp}:${serverPort}`;
        const result = await refreshServer(serverId) as { success?: boolean; server?: ServerStatus };
        
        if (result.success && result.server) {
          realPlayers = result.server.real_players ?? result.server.players ?? result.server.Players ?? 0;
          maxPlayers = result.server.max_players ?? result.server.MaxPlayers ?? DEFAULT_MAX_PLAYERS;
          querySuccess = true;
          setUseLocalA2S(false);
          console.log('[AutoJoin] Using API query:', { realPlayers, maxPlayers });
        }
      }
      
      if (querySuccess) {
        const availableSlots = maxPlayers - realPlayers;
        
        setCurrentPlayers(realPlayers);
        setCurrentMaxPlayers(maxPlayers);
        
        if (availableSlots >= minSlots) {
          setStatusText(`✅ ${t.autoJoinDetected} ${availableSlots} ≥ ${minSlots}`);
          
          // Join the server
          const steamUrl = buildJoinUrl(serverIp, serverPort, server.game_id ?? server.GameID, server.game);
          try {
            if (isTauriAvailable()) {
              const { open } = await import('@tauri-apps/plugin-shell');
              await open(steamUrl);
            } else {
              window.location.href = steamUrl;
            }
          } catch (error) {
            console.error('Failed to open Steam:', error);
            window.location.href = steamUrl;
          }
          
          // Stop monitoring and close after a delay
          setTimeout(() => {
            doStopMonitoring();
            onClose();
          }, 2000);
        } else {
          setStatusText(`${t.autoJoinWaiting} (${realPlayers}/${maxPlayers})`);
        }
      } else {
        setStatusText(t.autoJoinCheckFailed);
      }
    } catch (error) {
      console.error('Auto-join check failed:', error);
      setStatusText(t.autoJoinCheckFailed);
    }
    
    // Reset countdown
    setCountdown(checkInterval);
  }, [serverIp, serverPort, minSlots, onClose, t, checkInterval, server.game_id, server.GameID, server.game]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    // Save settings to localStorage
    localStorage.setItem('autoJoinMinSlots', String(minSlots));
    localStorage.setItem('autoJoinCheckInterval', String(checkInterval));
    
    setIsMonitoring(true);
    setCountdown(checkInterval);
    
    // Check immediately
    setTimeout(checkServer, 0);
    
    // Set up check interval (convert seconds to milliseconds)
    checkIntervalRef.current = setInterval(checkServer, checkInterval * 1000);
    
    // Set up countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? checkInterval : prev - 1));
    }, 1000);
  }, [minSlots, checkInterval, checkServer]);

  // Toggle monitoring
  const handleToggle = () => {
    if (isMonitoring) {
      doStopMonitoring();
    } else {
      startMonitoring();
    }
  };

  // Update preview when min slots changes
  const handleMinSlotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
    setMinSlots(value);
  };

  // Update check interval (ensure integer in range 2-300)
  const handleCheckIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    // Ensure integer safety: handle NaN, negative values, clamp to valid range 2-300
    const safeValue = Number.isNaN(parsed) || parsed < 0 ? DEFAULT_CHECK_INTERVAL : Math.floor(parsed);
    const value = Math.max(MIN_CHECK_INTERVAL, Math.min(MAX_CHECK_INTERVAL, safeValue));
    setCheckInterval(value);
  };

  const availableSlots = currentMaxPlayers - currentPlayers;

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
              <CheckCircleIcon />
              <div>
                <h2 className="text-lg font-bold">{t.autoJoinTitle}</h2>
                <p className="text-cyan-100 text-sm mt-1 truncate max-w-[250px]">{serverName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status panel (shown when monitoring) */}
          {isMonitoring && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-3">
                <SpinnerIcon />
                <span className="text-blue-700 dark:text-blue-400 font-medium">{statusText || t.autoJoinMonitoring}</span>
                {useLocalA2S && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                    <LocalQueryIcon />
                    A2S
                  </span>
                )}
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
                    min={MIN_CHECK_INTERVAL}
                    max={MAX_CHECK_INTERVAL}
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
