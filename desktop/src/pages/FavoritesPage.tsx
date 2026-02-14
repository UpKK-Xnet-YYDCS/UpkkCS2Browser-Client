import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as api from '@/api';
import { getApiToken, setApiToken, clearApiToken } from '@/api';
import type { FavoriteServer, AuthStatus } from '@/api';
import type { ServerStatus } from '@/types';
import { useTheme, rgbaToCss } from '@/store/theme';
import { useI18n } from '@/store/i18n';
import { ServerCard } from '@/components/ServerCard';
import { ServerListItem } from '@/components/ServerListItem';
import { ViewModeSwitch } from '@/components/ViewModeSwitch';
import type { ViewMode } from '@/components/ViewModeSwitch';
import { ServerDetailModal } from '@/components/ServerDetailModal';

// LocalStorage keys for persisting auth state
const AUTH_STORAGE_KEY = 'xproj_auth_status';
// Default auto-refresh interval in seconds (same as server list)
const DEFAULT_AUTO_REFRESH_INTERVAL = 60;
// Delay after favorite toggle before refreshing list (ms)
const FAVORITE_SYNC_DELAY_MS = 500;
// Items per page options
const PAGE_SIZE_OPTIONS = [12, 24, 48];
// Default game server port
const DEFAULT_SERVER_PORT = '27015';

// Save auth status to localStorage
function saveAuthToStorage(auth: AuthStatus) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } catch { /* ignore */ }
}

// Load auth status from localStorage
function loadAuthFromStorage(): AuthStatus | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch { /* ignore */ }
  return null;
}

// Clear auth from localStorage
function clearAuthStorage() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch { /* ignore */ }
}

// Steam icon component
const SteamIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.623 3.872 10.328 9.092 11.63l3.18-4.608c-.047-.002-.094-.002-.142-.002-1.633 0-3.092-.745-4.055-1.913L.957 13.96c.227 4.554 3.946 8.195 8.543 8.518L12 18.893l2.5 3.585c4.597-.323 8.316-3.964 8.543-8.518l-7.118 3.147c-.963 1.168-2.422 1.913-4.055 1.913-.048 0-.095 0-.142.002l3.18 4.608C20.128 22.328 24 17.623 24 12 24 5.373 18.627 0 12 0zm-1.67 14.889c-.854.378-1.846.29-2.612-.283l-1.92-.85c.245.734.702 1.382 1.32 1.858.618.476 1.366.748 2.142.777 1.633.057 3.077-.983 3.44-2.479a3.24 3.24 0 00-.08-1.608 3.126 3.126 0 00-.79-1.325l1.921.85c.562.877.642 1.985.21 2.94a3.188 3.188 0 01-1.631 1.62z"/>
  </svg>
);

// Google icon component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Discord icon component
const DiscordIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
  </svg>
);

// Upkk forum icon component
const UpkkIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

// Star filled icon
const StarFilledIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

// Refresh icon
const RefreshIcon = ({ spinning = false }) => (
  <svg className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Logout icon
const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

// Search icon
const SearchIcon = () => (
  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// Plus icon
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// Convert FavoriteServer to ServerStatus for use with ServerCard
function favoriteToServerStatus(fav: FavoriteServer): ServerStatus {
  return {
    name: fav.current_name || fav.server_name || '',
    ip: fav.server_ip,
    port: fav.server_port,
    game: fav.game || '',
    region: '',
    mode: '',
    players: fav.players ?? fav.current_players ?? 0,
    max_players: fav.max_players ?? 0,
    bots: fav.bots ?? 0,
    real_players: fav.real_players ?? fav.players ?? fav.current_players ?? 0,
    map_name: fav.map_name || '',
    comments: '',
    display_address: fav.server_ip,
    mapnamecn: '',
    map_image_url: fav.map_image_url,
    category: fav.category || '',
    priority: fav.priority ?? 0,
    config_order: 0,
    admin_sort_priority: 0,
    submitter_uid: 0,
    country_code: fav.country_code || '',
    country_name: fav.country_name || '',
    server_type: '',
    environment: '',
    vac: false,
    password: false,
    version: '',
    game_id: 0,
    last_updated: fav.last_updated || '',
    Online: fav.online ?? fav.is_online ?? false,
  };
}

// Countdown Progress Bar Component (same as server list)
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

// Add Favorite Modal
function AddFavoriteModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { t } = useI18n();
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    // Parse IP:Port
    const parts = trimmed.split(':');
    const ip = parts[0]?.trim();
    const port = parts[1]?.trim() || DEFAULT_SERVER_PORT;
    if (!ip) return;

    setIsSubmitting(true);
    setError('');
    try {
      const result = await api.addFavorite(ip, port, name.trim() || trimmed, notes.trim());
      if (result.success) {
        // Trigger A2S query to immediately populate server info
        api.refreshServer(`${ip}:${port}`).catch(() => {});
        onAdded();
        onClose();
      } else {
        setError((result as unknown as { error?: string }).error || 'Failed to add');
      }
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
            <h2 className="text-lg font-bold">{t.addFavoriteTitle}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-green-100 text-sm mt-1">{t.addFavoriteDesc}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.serverAddress}</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="192.168.1.1:27015"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 outline-none transition-all"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.serverNameOptional}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.serverNameOptional}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.notesOptional}</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t.notesOptional}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 outline-none transition-all"
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
              {isSubmitting ? '...' : t.addToFavorites}
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

export function FavoritesPage() {
  const theme = useTheme();
  const { t } = useI18n();
  // Initialize auth from localStorage (persisted across restarts)
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => {
    return loadAuthFromStorage() || { logged_in: false };
  });
  const [favorites, setFavorites] = useState<FavoriteServer[]>([]);
  const [totalFavorites, setTotalFavorites] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerStatus | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('favoritesPerPage');
    return saved ? parseInt(saved, 10) : PAGE_SIZE_OPTIONS[0];
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('favoritesViewMode');
    return (saved === 'list' ? 'list' : 'card') as ViewMode;
  });
  const loginDetectedRef = useRef(false);

  // Auto-refresh countdown (same pattern as HomePage)
  const [refreshInterval] = useState(() => {
    const saved = localStorage.getItem('autoRefreshInterval');
    return saved ? parseInt(saved, 10) : DEFAULT_AUTO_REFRESH_INTERVAL;
  });
  const [countdown, setCountdown] = useState(refreshInterval);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetSignalRef = useRef(0);

  const primaryColor = rgbaToCss(theme.colorRegions.primary);
  const cardBgColor = rgbaToCss(theme.colorRegions.sidebar);
  const textColor = rgbaToCss(theme.colorRegions.text);

  // On mount: if we have an API token, verify it by fetching user info
  useEffect(() => {
    const verifyAuth = async () => {
      const token = getApiToken();
      if (!token) {
        setAuthStatus({ logged_in: false });
        return;
      }
      
      try {
        // Token exists - verify it by calling the API (token is auto-included by fetchApi)
        const status = await api.checkAuthStatus();
        if (status.logged_in) {
          setAuthStatus(status);
          saveAuthToStorage(status);
        } else {
          // Token expired or invalid
          clearApiToken();
          clearAuthStorage();
          setAuthStatus({ logged_in: false });
        }
      } catch {
        // Keep cached auth status if network fails
      }
    };
    verifyAuth();
  }, []);

  // Listen for login-token-ready event from the Tauri backend
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    
    const setupListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const unlistenFn = await listen<string>('login-token-ready', async (event) => {
          console.log('[Favorites] Token received from login WebView');
          loginDetectedRef.current = true;
          setLoginPending(false);
          
          try {
            const data = JSON.parse(event.payload);
            
            if (data.error) {
              console.error('[Favorites] Token generation failed:', data.error);
              return;
            }
            
            if (data.token) {
              console.log('[Favorites] API token stored successfully');
              setApiToken(data.token);
              
              const newAuth: AuthStatus = {
                logged_in: true,
                user: data.user ? {
                  id: data.user.id,
                  username: data.user.username || data.user.display_name || 'User',
                  avatar: data.user.avatar_url,
                  provider: data.user.provider || 'steam',
                } : undefined
              };
              setAuthStatus(newAuth);
              saveAuthToStorage(newAuth);
              
              // Fetch favorites using the token
              try {
                const result = await api.getAllFavorites();
                if (result.favorites && Array.isArray(result.favorites)) {
                  setFavorites(result.favorites);
                  setTotalFavorites(result.total);
                }
              } catch (err) {
                console.error('[Favorites] Failed to load favorites after login:', err);
              }
            }
          } catch (parseErr) {
            console.error('[Favorites] Failed to parse token data:', parseErr);
          }
        });
        unlisten = unlistenFn;
      } catch (err) {
        console.log('[Favorites] Could not set up Tauri event listener:', err);
      }
    };
    
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, []);

  // Load favorites
  const loadFavorites = useCallback(async (showLoadingOverlay = false) => {
    if (!authStatus.logged_in) {
      setIsLoading(false);
      return;
    }
    
    if (showLoadingOverlay) {
      setIsManualRefresh(true);
    }
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await api.getAllFavorites();
      if (result.favorites && Array.isArray(result.favorites)) {
        setFavorites(result.favorites);
        setTotalFavorites(result.total);
      }
    } catch (err) {
      console.error('[Favorites] Failed to load favorites:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('401') || errMsg.includes('Not logged in')) {
        clearApiToken();
        clearAuthStorage();
        setAuthStatus({ logged_in: false });
      } else {
        setError(errMsg);
      }
    } finally {
      setIsLoading(false);
      setIsManualRefresh(false);
    }
  }, [authStatus.logged_in]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Auto-refresh with countdown (same pattern as HomePage)
  useEffect(() => {
    if (!authStatus.logged_in || refreshInterval <= 0) return;

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    let lastResetSignal = resetSignalRef.current;

    countdownRef.current = setInterval(() => {
      if (resetSignalRef.current !== lastResetSignal) {
        lastResetSignal = resetSignalRef.current;
        setCountdown(refreshInterval);
        return;
      }

      setCountdown(prev => {
        if (prev <= 1) {
          loadFavorites();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [refreshInterval, authStatus.logged_in, loadFavorites]);

  // Callback for when a favorite is added/removed via ServerCard star button
  const handleFavoriteChange = useCallback(() => {
    setTimeout(() => loadFavorites(), FAVORITE_SYNC_DELAY_MS);
  }, [loadFavorites]);

  // Manual refresh
  const handleRefresh = () => {
    loadFavorites(true);
    resetSignalRef.current += 1;
  };

  // Reorder favorites
  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const globalIndex = (currentPage - 1) * itemsPerPage + index;
    const swapIndex = direction === 'up' ? globalIndex - 1 : globalIndex + 1;
    if (swapIndex < 0 || swapIndex >= favorites.length) return;

    const newFavorites = [...favorites];
    [newFavorites[globalIndex], newFavorites[swapIndex]] = [newFavorites[swapIndex], newFavorites[globalIndex]];
    setFavorites(newFavorites);

    // Persist sort order to backend
    const orders = newFavorites.map((fav, i) => ({
      server_ip: fav.server_ip,
      server_port: fav.server_port,
      sort_order: i,
    }));
    api.updateFavoriteSortOrder(orders).catch(err => {
      console.error('[Favorites] Failed to update sort order:', err);
    });
  };

  // Change page size
  const handlePageSizeChange = (size: number) => {
    setItemsPerPage(size);
    localStorage.setItem('favoritesPerPage', String(size));
    setCurrentPage(1);
  };

  // Change view mode
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('favoritesViewMode', mode);
  };

  // Logout
  const handleLogout = async () => {
    await api.logout();
    setAuthStatus({ logged_in: false });
    setFavorites([]);
    clearAuthStorage();
  };

  // Open provider login in WebView2 window
  const handleProviderLogin = async (provider: 'steam' | 'google' | 'discord' | 'upkk') => {
    let loginUrl: string;
    switch (provider) {
      case 'google':
        loginUrl = api.getGoogleLoginUrl();
        break;
      case 'discord':
        loginUrl = api.getDiscordLoginUrl();
        break;
      case 'upkk':
        loginUrl = api.getUpkkLoginUrl();
        break;
      default:
        loginUrl = api.getSteamLoginUrl();
    }
    
    console.log(`[Favorites] Opening ${provider} login:`, loginUrl);
    setLoginPending(true);
    loginDetectedRef.current = false;
    
    try {
      await invoke('open_steam_login', { loginUrl });
      console.log(`[Favorites] ${provider} login window opened`);
      
      setTimeout(() => {
        if (!loginDetectedRef.current) {
          setLoginPending(false);
        }
      }, 300000);
      
    } catch (error) {
      console.error(`[Favorites] Failed to open login window:`, error);
      setLoginPending(false);
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(loginUrl);
      } catch (shellError) {
        console.error('[Favorites] Shell open also failed:', shellError);
        window.location.href = loginUrl;
      }
    }
  };

  // Client-side search filtering
  const filteredFavorites = useMemo(() => {
    if (!searchQuery.trim()) return favorites;
    const q = searchQuery.toLowerCase();
    return favorites.filter(fav => {
      const name = (fav.current_name || fav.server_name || '').toLowerCase();
      const addr = `${fav.server_ip}:${fav.server_port}`.toLowerCase();
      const map = (fav.map_name || '').toLowerCase();
      const category = (fav.category || '').toLowerCase();
      return name.includes(q) || addr.includes(q) || map.includes(q) || category.includes(q);
    });
  }, [favorites, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredFavorites.length / itemsPerPage));
  const paginatedFavorites = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFavorites.slice(start, start + itemsPerPage);
  }, [filteredFavorites, currentPage, itemsPerPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Clamp currentPage to valid range when favorites list shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  // Not logged in - show login prompt with multiple providers
  if (!authStatus.logged_in) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div 
          className="max-w-md w-full rounded-2xl shadow-xl p-8 text-center"
          style={{ backgroundColor: cardBgColor }}
        >
          <div 
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <StarFilledIcon />
          </div>
          
          <h2 className="text-2xl font-bold mb-2" style={{ color: textColor }}>
            {t.cloudFavorites}
          </h2>
          
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {t.cloudFavoritesDesc}
          </p>
          
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
            {t.loginChooseProvider}
          </p>
          
          {/* Login buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleProviderLogin('steam')}
              disabled={loginPending}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl text-white font-medium transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              style={{ backgroundColor: '#171a21' }}
            >
              <SteamIcon />
              <span>{loginPending ? '...' : t.loginWithSteam}</span>
            </button>
            
            <button
              onClick={() => handleProviderLogin('upkk')}
              disabled={loginPending}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl text-white font-medium transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              style={{ backgroundColor: '#e74c3c' }}
            >
              <UpkkIcon />
              <span>{loginPending ? '...' : t.loginWithUpkk}</span>
            </button>
            
            <button
              onClick={() => handleProviderLogin('google')}
              disabled={loginPending}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 hover:shadow-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:hover:scale-100"
            >
              <GoogleIcon />
              <span>{loginPending ? '...' : t.loginWithGoogle}</span>
            </button>
            
            <button
              onClick={() => handleProviderLogin('discord')}
              disabled={loginPending}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl text-white font-medium transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              style={{ backgroundColor: '#5865F2' }}
            >
              <DiscordIcon />
              <span>{loginPending ? '...' : t.loginWithDiscord}</span>
            </button>
          </div>
          
          {loginPending && (
            <p className="text-sm text-blue-500 mt-4 animate-pulse">
              ⏳ {t.syncFavoritesHint}
            </p>
          )}
          
          <p className="text-xs text-gray-400 mt-4">
            {t.syncFavoritesHint}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          {/* Row 1: Header + User info */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <StarFilledIcon />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: textColor }}>
                  {t.myFavorites}
                </h1>
                <p className="text-xs text-gray-500">
                  {authStatus.user?.username && `${t.welcome}, ${authStatus.user.username}`}
                  {filteredFavorites.length > 0 && ` · ${filteredFavorites.length} ${t.favorites}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 text-sm transition-colors"
              title={t.logout}
            >
              <LogoutIcon />
              <span>{t.logout}</span>
            </button>
          </div>
          {/* Row 2: Search + Controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchFavorites}
                className="block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-transparent hover:bg-gray-200/80 dark:hover:bg-gray-700/80 focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800 focus:ring-4 focus:ring-blue-500/20 text-gray-900 dark:text-white placeholder-gray-400 transition-all duration-200 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Countdown progress bar */}
            {refreshInterval > 0 && (
              <CountdownProgressBar 
                secondsRemaining={countdown} 
                totalSeconds={refreshInterval}
                isLoading={isLoading && isManualRefresh}
              />
            )}
            {/* View mode switch */}
            <ViewModeSwitch viewMode={viewMode} onViewModeChange={handleViewModeChange} />
            {/* Add favorite button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-200 shadow-md hover:shadow-lg"
              title={t.addFavoriteTitle}
            >
              <PlusIcon />
            </button>
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg"
              title={t.refresh}
            >
              <RefreshIcon spinning={isLoading && isManualRefresh} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Error state */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-red-700 dark:text-red-400">{error}</p>
                <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && favorites.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden animate-pulse">
                  <div className="h-40 bg-gray-200 dark:bg-gray-700" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && favorites.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: textColor }}>
                  {t.noFavorites}
                </h3>
                <p className="text-gray-500 mb-4">
                  {t.noFavoritesHint}
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium transition-colors hover:from-green-600 hover:to-emerald-600"
                >
                  {t.addFavoriteTitle}
                </button>
              </div>
            </div>
          )}

          {/* Favorites grid */}
          {paginatedFavorites.length > 0 && (
            <div className="relative">
              {/* Loading overlay for manual refresh */}
              {isLoading && isManualRefresh && (
                <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] flex items-start justify-center pt-20 z-10 rounded-xl transition-opacity">
                  <div className="flex flex-col items-center gap-3 bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="w-10 h-10 border-3 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">{t.loadingFavorites}</span>
                  </div>
                </div>
              )}

              {/* Top pagination and page size */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {t.favorites}: {filteredFavorites.length}
                  {searchQuery && ` / ${totalFavorites}`}
                </p>
                <div className="flex items-center gap-3">
                  {/* Page size selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">{t.itemsPerPage}</span>
                    <select
                      value={itemsPerPage}
                      onChange={e => handlePageSizeChange(Number(e.target.value))}
                      className="text-sm px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border-0 text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      {PAGE_SIZE_OPTIONS.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                      >
                        ‹
                      </button>
                      <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedFavorites.map((fav, index) => {
                  const serverStatus = favoriteToServerStatus(fav);
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;
                  return (
                    <div key={`${fav.server_ip}:${fav.server_port}`} className="relative group">
                      <ServerCard
                        server={serverStatus}
                        onClick={() => setSelectedServer(serverStatus)}
                        onFavoriteChange={handleFavoriteChange}
                        hideCloudFavorite
                      />
                      {/* Reorder buttons */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(index, 'up'); }}
                          disabled={globalIndex === 0}
                          className="p-1 rounded-md bg-black/50 text-white/80 hover:bg-black/70 hover:text-white disabled:opacity-30 backdrop-blur-sm transition-all"
                          title={t.moveUp}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(index, 'down'); }}
                          disabled={globalIndex >= favorites.length - 1}
                          className="p-1 rounded-md bg-black/50 text-white/80 hover:bg-black/70 hover:text-white disabled:opacity-30 backdrop-blur-sm transition-all"
                          title={t.moveDown}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : (
              <div className="space-y-2">
                {paginatedFavorites.map((fav, index) => {
                  const serverStatus = favoriteToServerStatus(fav);
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;
                  return (
                    <div key={`${fav.server_ip}:${fav.server_port}`} className="relative group">
                      {/* Reorder buttons for list view - positioned at left to avoid blocking join button */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(index, 'up'); }}
                          disabled={globalIndex === 0}
                          className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-all"
                          title={t.moveUp}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(index, 'down'); }}
                          disabled={globalIndex >= favorites.length - 1}
                          className="p-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-all"
                          title={t.moveDown}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      <ServerListItem
                        server={serverStatus}
                        onClick={() => setSelectedServer(serverStatus)}
                      />
                    </div>
                  );
                })}
              </div>
              )}

              {/* Bottom pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          page === currentPage
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Search returned no results */}
          {!isLoading && searchQuery && filteredFavorites.length === 0 && favorites.length > 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-gray-500">{t.noServersFound}</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-sm text-blue-500 hover:text-blue-600"
                >
                  {t.showAllServers}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedServer && (
        <ServerDetailModal
          server={selectedServer}
          onClose={() => setSelectedServer(null)}
          isCloudFavorite={true}
          onFavoriteRemoved={() => { setSelectedServer(null); loadFavorites(); }}
        />
      )}

      {showAddModal && (
        <AddFavoriteModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { loadFavorites(); resetSignalRef.current += 1; }}
        />
      )}
    </div>
  );
}
