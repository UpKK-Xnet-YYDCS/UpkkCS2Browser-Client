import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTheme, rgbaToCss } from '@/store/theme';
import { useI18n, type Translations } from '@/store/i18n';
import { useAppStore } from '@/store';
import { getApiToken, setApiToken, clearApiToken, checkAuthStatus, getSteamLoginUrl, getGoogleLoginUrl, getDiscordLoginUrl, getUpkkLoginUrl, getFavorites, type FavoriteServer, type AuthStatus } from '@/api';
import { buildJoinUrl } from '@/components/SteamClientSwitch';
import { showToast } from '@/components/ToastNotification';
import { isTauriAvailable, parseServerAddress, queryServerA2S } from '@/services/a2s';
import {
  type MonitorRule,
  type MonitorStatus,
  type MatchedServer,
  type MonitorNotifySettings,
  MONITOR_RULES_KEY,
  loadMonitorRules,
  loadMonitorRulesFromFile,
  saveMonitorRules,
  getMonitorInterval,
  setMonitorInterval as saveMonitorInterval,
  loadNotifySettings,
  saveNotifySettings,
  createDefaultRule,
  performMonitorCheck,
  sendDiscordWebhook,
  sendDesktopNotification,
  sendServerChanNotification,
  sendCustomWebhook,
  formatNotificationMessage,
  MESSAGE_PLACEHOLDERS,
  DEFAULT_MESSAGE_TEMPLATE,
  DEFAULT_ALERT_TITLE,
  getMonitorEnabled,
  setMonitorEnabled,
} from '@/services/monitor';

const LOGIN_TIMEOUT_MS = 300000;

// ============== Icons ==============

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StopIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DiscordIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
  </svg>
);

const DesktopIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ServerChanIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
  </svg>
);

const CustomWebhookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XMarkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const TestIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

// Login provider icons
const SteamLoginIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.623 3.872 10.328 9.092 11.63l3.18-4.608c-.047-.002-.094-.002-.142-.002-1.633 0-3.092-.745-4.055-1.913L.957 13.96c.227 4.554 3.946 8.195 8.543 8.518L12 18.893l2.5 3.585c4.597-.323 8.316-3.964 8.543-8.518l-7.118 3.147c-.963 1.168-2.422 1.913-4.055 1.913-.048 0-.095 0-.142.002l3.18 4.608C20.128 22.328 24 17.623 24 12 24 5.373 18.627 0 12 0zm-1.67 14.889c-.854.378-1.846.29-2.612-.283l-1.92-.85c.245.734.702 1.382 1.32 1.858.618.476 1.366.748 2.142.777 1.633.057 3.077-.983 3.44-2.479a3.24 3.24 0 00-.08-1.608 3.126 3.126 0 00-.79-1.325l1.921.85c.562.877.642 1.985.21 2.94a3.188 3.188 0 01-1.631 1.62z"/>
  </svg>
);

const GoogleLoginIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const DiscordLoginIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
  </svg>
);

const UpkkLoginIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

// ============== Types ==============

interface MonitoredServerDetails {
  name: string;
  map: string;
  players: number;
  maxPlayers: number;
  updatedAt: string;
}

// ============== Rule Editor Modal ==============

interface RuleEditorProps {
  rule: MonitorRule;
  onSave: (rule: MonitorRule) => void;
  onCancel: () => void;
  t: Translations;
}

function RuleEditor({ rule, onSave, onCancel, t }: RuleEditorProps) {
  const [editRule, setEditRule] = useState<MonitorRule>({ ...rule });
  const [mapInput, setMapInput] = useState('');
  const [favoriteServers, setFavoriteServers] = useState<FavoriteServer[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [serverSearch, setServerSearch] = useState('');
  const [serverPage, setServerPage] = useState(1);
  const SERVERS_PER_PAGE = 10;
  const { favorites: localFavorites } = useAppStore();
  // Resolved server names for local-only favorites via A2S query
  const [localServerNames, setLocalServerNames] = useState<Record<string, string>>({});

  // Load cloud favorites on mount
  const loadFavorites = useCallback(() => {
    if (favoritesLoaded || loadingFavorites) return;
    setLoadingFavorites(true);
    getFavorites(1, 200)
      .then(res => {
        setFavoriteServers(res.favorites || []);
        setFavoritesLoaded(true);
      })
      .catch(() => { setFavoritesLoaded(true); })
      .finally(() => setLoadingFavorites(false));
  }, [favoritesLoaded, loadingFavorites]);

  // Always load favorites
  useEffect(() => {
    if (!favoritesLoaded) {
      loadFavorites();
    }
  }, [favoritesLoaded, loadFavorites]);

  // Resolve server names for local-only favorites via A2S queries
  useEffect(() => {
    if (!favoritesLoaded) return;
    const cloudKeys = new Set(favoriteServers.map(s => `${s.server_ip}:${s.server_port}`));
    const localOnly = localFavorites.filter(addr => !cloudKeys.has(addr));
    if (localOnly.length === 0) return;

    let cancelled = false;
    const resolveNames = async () => {
      const resolved: Record<string, string> = {};
      for (const addr of localOnly) {
        if (cancelled) break;
        const parsed = parseServerAddress(addr);
        if (!parsed) continue;
        try {
          const result = await queryServerA2S(parsed.ip, parsed.port);
          if (result.success && result.name) {
            resolved[addr] = result.name;
          }
        } catch {
          // ignore — keep showing IP:PORT
        }
      }
      if (!cancelled) {
        setLocalServerNames(prev => ({ ...prev, ...resolved }));
      }
    };
    resolveNames();
    return () => { cancelled = true; };
  }, [favoritesLoaded, favoriteServers, localFavorites]);

  const toggleServerSelection = (serverKey: string) => {
    setEditRule(prev => {
      const selected = prev.selectedServers.includes(serverKey)
        ? prev.selectedServers.filter(s => s !== serverKey)
        : [...prev.selectedServers, serverKey];
      return { ...prev, selectedServers: selected };
    });
  };

  const addMapPattern = () => {
    const pattern = mapInput.trim();
    if (pattern && !editRule.mapPatterns.includes(pattern)) {
      setEditRule(prev => ({ ...prev, mapPatterns: [...prev.mapPatterns, pattern] }));
      setMapInput('');
    }
  };

  const removeMapPattern = (pattern: string) => {
    setEditRule(prev => ({ ...prev, mapPatterns: prev.mapPatterns.filter(p => p !== pattern) }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BellIcon />
            {editRule.id === rule.id && rule.name ? t.monitorEditRule : t.monitorNewRule}
          </h2>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <XMarkIcon />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.monitorRuleName}
            </label>
            <input
              type="text"
              value={editRule.name}
              onChange={e => setEditRule(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t.monitorRuleNamePlaceholder}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Server Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.monitorSelectedServers}
            </label>
            <div className="mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {t.monitorSelectFromFavorites}
                  {editRule.selectedServers.length > 0 && (
                    <span className="ml-2 text-blue-500 font-medium">
                      ({editRule.selectedServers.length} {t.monitorSelectedCount})
                    </span>
                  )}
                </p>
                {/* Search input */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={serverSearch}
                    onChange={e => { setServerSearch(e.target.value); setServerPage(1); }}
                    placeholder={t.monitorSearchServers}
                    className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                {loadingFavorites ? (
                  <div className="text-sm text-gray-400 dark:text-gray-500 py-3 text-center">
                    {t.monitorLoadingFavorites}
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-xl border-2 border-gray-200 dark:border-gray-600">
                    {(() => {
                      const q = serverSearch.trim().toLowerCase();
                      // Build a unified list: cloud favorites + local-only favorites
                      const cloudKeys = new Set(favoriteServers.map(s => `${s.server_ip}:${s.server_port}`));
                      const cloudEntries = favoriteServers.map(server => ({
                        key: `${server.server_ip}:${server.server_port}`,
                        name: server.current_name || server.server_name || `${server.server_ip}:${server.server_port}`,
                        map: server.map_name || '',
                        source: 'cloud' as const,
                      }));
                      const localEntries = localFavorites
                        .filter(addr => !cloudKeys.has(addr))
                        .map(addr => ({
                          key: addr,
                          name: localServerNames[addr] || addr,
                          map: '',
                          source: 'local' as const,
                        }));
                      const allEntries = [...cloudEntries, ...localEntries];
                      const filtered = allEntries.filter(entry => {
                        if (!q) return true;
                        return entry.name.toLowerCase().includes(q) || entry.key.toLowerCase().includes(q) || entry.map.toLowerCase().includes(q);
                      });
                      const totalPages = Math.max(1, Math.ceil(filtered.length / SERVERS_PER_PAGE));
                      const paginated = filtered.slice((serverPage - 1) * SERVERS_PER_PAGE, serverPage * SERVERS_PER_PAGE);
                      if (filtered.length === 0) {
                        return (
                          <div className="text-sm text-gray-400 dark:text-gray-500 py-3 text-center">
                            {t.monitorNoFavoritesAvailable}
                          </div>
                        );
                      }
                      return (
                        <>
                          {paginated.map(entry => {
                            const isSelected = editRule.selectedServers.includes(entry.key);
                            return (
                              <button
                                key={entry.key}
                                onClick={() => toggleServerSelection(entry.key)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors border-b last:border-b-0 border-gray-100 dark:border-gray-700 ${
                                  isSelected
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <span className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-500'
                                }`}>
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium">{entry.name}</div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    {entry.key}
                                    {entry.source === 'local' && (
                                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px]">
                                        {t.monitorLocalFavorites}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {entry.map && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">🗺️ {entry.map}</span>
                                )}
                              </button>
                            );
                          })}
                          {/* Pagination controls */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                              <button
                                onClick={() => setServerPage(p => Math.max(1, p - 1))}
                                disabled={serverPage <= 1}
                                className="px-2 py-1 text-xs rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                ← Prev
                              </button>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {serverPage} / {totalPages}
                              </span>
                              <button
                                onClick={() => setServerPage(p => Math.min(totalPages, p + 1))}
                                disabled={serverPage >= totalPages}
                                className="px-2 py-1 text-xs rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                Next →
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
            </div>
          </div>

          {/* Map Patterns */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.monitorMapPatterns}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t.monitorMapPatternsHint}</p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={mapInput}
                onChange={e => setMapInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMapPattern(); } }}
                placeholder={t.monitorMapPatternPlaceholder}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <button
                onClick={addMapPattern}
                className={`px-4 py-2.5 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium ${
                  mapInput.trim() ? 'bg-blue-500 animate-pulse' : 'bg-blue-500'
                }`}
              >
                {t.monitorAdd}
              </button>
            </div>
            {mapInput.trim() && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1 font-medium">
                {t.monitorMapPatternAddReminder}
              </p>
            )}
            {editRule.mapPatterns.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editRule.mapPatterns.map(pattern => (
                  <span
                    key={pattern}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm"
                  >
                    <code className="font-mono">{pattern}</code>
                    <button
                      onClick={() => removeMapPattern(pattern)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <XMarkIcon />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Min Players */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.monitorMinPlayers}
            </label>
            <input
              type="number"
              min={0}
              max={128}
              value={editRule.minPlayers}
              onChange={e => setEditRule(prev => ({ ...prev, minPlayers: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
              className="w-32 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Cooldown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.monitorCooldown}
            </label>
            <select
              value={editRule.cooldownSeconds}
              onChange={e => setEditRule(prev => ({ ...prev, cooldownSeconds: parseInt(e.target.value, 10) }))}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value={60}>1 {t.monitorMinute}</option>
              <option value={300}>5 {t.monitorMinutes}</option>
              <option value={600}>10 {t.monitorMinutes}</option>
              <option value={1800}>30 {t.monitorMinutes}</option>
              <option value={3600}>1 {t.monitorHour}</option>
            </select>
          </div>

          {/* Required Consecutive Matches */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.monitorRequiredMatches}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t.monitorRequiredMatchesHint}</p>
            <select
              value={editRule.requiredMatches ?? 1}
              onChange={e => setEditRule(prev => ({ ...prev, requiredMatches: parseInt(e.target.value, 10) }))}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value={1}>1 {t.monitorMatchTimes} ({t.monitorMatchImmediate})</option>
              <option value={2}>2 {t.monitorMatchTimes}</option>
              <option value={3}>3 {t.monitorMatchTimes}</option>
              <option value={5}>5 {t.monitorMatchTimes}</option>
            </select>
          </div>

          {/* Auto-Join */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{t.monitorAutoJoin}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t.monitorAutoJoinDesc}</div>
            </div>
            <button
              onClick={() => setEditRule(prev => ({ ...prev, autoJoin: !prev.autoJoin }))}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                editRule.autoJoin ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${
                editRule.autoJoin ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {/* Auto-Join Warning */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {t.monitorAutoJoinWarning}
            </p>
          </div>

          {/* Notification Channels - configured in global settings */}
        </div>
        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => onSave(editRule)}
            disabled={!editRule.name.trim() || editRule.mapPatterns.length === 0}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
          >
            {t.monitorSaveRule}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============== Main Monitor Page ==============

export function MonitorPage() {
  const theme = useTheme();
  const { t } = useI18n();
  const [rules, setRules] = useState<MonitorRule[]>(() => loadMonitorRules());
  const [interval, setInterval_] = useState(() => getMonitorInterval());
  const [isEnabled, setIsEnabled] = useState(() => {
    const savedRules = loadMonitorRules();
    const hasEnabledRules = savedRules.some(r => r.enabled && r.mapPatterns.length > 0);
    // Resume monitoring if it was running before (e.g. page refresh via right-click)
    if (getMonitorEnabled() && hasEnabledRules) {
      return true;
    }
    return false;
  });
  const [status, setStatus] = useState<MonitorStatus>({
    isRunning: false,
    lastCheckTime: null,
    nextCheckTime: null,
    matchedServers: [],
    checkCount: 0,
    errorCount: 0,
    lastError: null,
  });
  const [currentMatches, setCurrentMatches] = useState<MatchedServer[]>([]);
  const [editingRule, setEditingRule] = useState<MonitorRule | null>(null);
  const [showStartPrompt, setShowStartPrompt] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [notifySettings, setNotifySettings_] = useState<MonitorNotifySettings>(() => loadNotifySettings());
  const [desktopTestResult, setDesktopTestResult] = useState<string | null>(null);
  const [discordTestResult, setDiscordTestResult] = useState<string | null>(null);
  const [serverChanTestResult, setServerChanTestResult] = useState<string | null>(null);
  const [customWebhookTestResult, setCustomWebhookTestResult] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to hold latest rules so the monitor loop doesn't restart when rules change
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  // Persist monitor enabled state to localStorage so it survives page refreshes
  useEffect(() => {
    setMonitorEnabled(isEnabled);
  }, [isEnabled]);

  // Load monitor rules from file-based storage on mount (authoritative source).
  // localStorage serves as a fast synchronous cache for initial render,
  // but file storage is the reliable persistent source across app restarts.
  useEffect(() => {
    loadMonitorRulesFromFile().then(fileRules => {
      if (fileRules !== null) {
        setRules(fileRules);
        // Sync localStorage cache with file data
        try { localStorage.setItem(MONITOR_RULES_KEY, JSON.stringify(fileRules)); } catch { /* ignore */ }
      }
    });
  }, []);

  // Auth state — initialize optimistically from token to avoid login screen flash
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => {
    const token = getApiToken();
    return token ? { logged_in: true } : { logged_in: false };
  });
  const [loginPending, setLoginPending] = useState(false);
  const loginDetectedRef = useRef(false);
  const isLoggedIn = authStatus.logged_in;

  // Verify auth on mount (non-blocking — won't flash login if token exists)
  useEffect(() => {
    const verifyAuth = async () => {
      const token = getApiToken();
      if (!token) {
        setAuthStatus({ logged_in: false });
        return;
      }
      try {
        const status = await checkAuthStatus();
        if (status.logged_in) {
          setAuthStatus(status);
        } else {
          clearApiToken();
          setAuthStatus({ logged_in: false });
        }
      } catch {
        // Keep going if network fails but token exists
        setAuthStatus({ logged_in: true });
      }
    };
    verifyAuth();
  }, []);

  // Listen for login-token-ready event from Tauri backend
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    const setupListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const unlistenFn = await listen<string>('login-token-ready', async (event) => {
          loginDetectedRef.current = true;
          setLoginPending(false);
          try {
            const data = JSON.parse(event.payload);
            if (data.error) return;
            if (data.token) {
              setApiToken(data.token);
              const newAuth: AuthStatus = {
                logged_in: true,
                user: data.user ? {
                  id: data.user.id,
                  username: data.user.username || data.user.display_name || 'User',
                  avatar: data.user.avatar_url,
                  provider: data.user.provider || 'steam',
                } : undefined,
              };
              setAuthStatus(newAuth);
            }
          } catch { /* ignore parse error */ }
        });
        unlisten = unlistenFn;
      } catch { /* not in Tauri */ }
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, []);

  // Open provider login
  const handleProviderLogin = async (provider: 'steam' | 'google' | 'discord' | 'upkk') => {
    let loginUrl: string;
    switch (provider) {
      case 'google': loginUrl = getGoogleLoginUrl(); break;
      case 'discord': loginUrl = getDiscordLoginUrl(); break;
      case 'upkk': loginUrl = getUpkkLoginUrl(); break;
      default: loginUrl = getSteamLoginUrl();
    }
    setLoginPending(true);
    loginDetectedRef.current = false;
    try {
      await invoke('open_steam_login', { loginUrl });
      setTimeout(() => {
        if (!loginDetectedRef.current) setLoginPending(false);
      }, LOGIN_TIMEOUT_MS);
    } catch {
      setLoginPending(false);
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(loginUrl);
      } catch {
        window.location.href = loginUrl;
      }
    }
  };

  // Perform a single check
  const runCheck = useCallback(async () => {
    const currentRules = rulesRef.current;
    if (currentRules.length === 0) return;
    
    setStatus(prev => ({ ...prev, isRunning: true }));
    const { matched, currentMatches: curMatches, autoJoined, error } = await performMonitorCheck(currentRules);
    
    // Update real-time matched servers (newest first)
    setCurrentMatches(curMatches.reverse());
    
    setStatus(prev => ({
      ...prev,
      isRunning: false,
      lastCheckTime: new Date().toISOString(),
      checkCount: prev.checkCount + 1,
      errorCount: error ? prev.errorCount + 1 : prev.errorCount,
      lastError: error,
      matchedServers: matched.length > 0
        ? [...matched, ...prev.matchedServers].slice(0, 30) // Keep last 30 notification history
        : prev.matchedServers,
    }));

    // If auto-join triggered, stop monitoring to avoid joining multiple servers
    if (autoJoined) {
      setIsEnabled(false);
      setCountdown(0);
      showToast(
        `▶ ${t.monitorAutoJoin}`,
        `${autoJoined.serverName} — ${autoJoined.mapName}`,
        'info',
        8000
      );
    }
  }, [t]);

  // Ref to hold latest runCheck so the monitor loop doesn't restart when runCheck changes
  const runCheckRef = useRef(runCheck);
  runCheckRef.current = runCheck;

  // Auto-monitor loop — only restarts when isEnabled or interval changes,
  // not when rules/runCheck change (uses refs to access latest values)
  useEffect(() => {
    if (!isEnabled || rulesRef.current.filter(r => r.enabled).length === 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const scheduleNext = () => {
      if (cancelled) return;
      setCountdown(interval);
      // Countdown ticker
      const tick = () => {
        if (cancelled) return;
        setCountdown(prev => {
          if (prev <= 1) return 0;
          countdownRef.current = setTimeout(tick, 1000);
          return prev - 1;
        });
      };
      countdownRef.current = setTimeout(tick, 1000);

      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        runCheckRef.current().then(() => {
          if (!cancelled) scheduleNext();
        });
      }, interval * 1000);
    };

    // Initial check with a small delay to avoid synchronous setState in effect
    const initialTimer = setTimeout(() => {
      if (!cancelled) {
        runCheckRef.current().then(() => {
          if (!cancelled) scheduleNext();
        });
      }
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [isEnabled, interval]);

  // Toggle monitoring
  const toggleMonitor = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    if (!newEnabled) {
      setStatus(prev => ({ ...prev, isRunning: false }));
      setCountdown(0);
    }
  };

  // Save rules
  const handleSaveRule = (rule: MonitorRule) => {
    setRules(prev => {
      const existing = prev.findIndex(r => r.id === rule.id);
      const updated = existing >= 0
        ? prev.map(r => r.id === rule.id ? rule : r)
        : [...prev, rule];
      saveMonitorRules(updated);
      return updated;
    });
    setEditingRule(null);
    // Prompt to start/restart monitoring
    setShowStartPrompt(true);
  };

  // Handle start/restart monitoring from prompt
  const handleStartMonitorFromPrompt = () => {
    setShowStartPrompt(false);
    if (isEnabled) {
      // Restart: toggle off then on to re-trigger the useEffect
      setIsEnabled(false);
      setTimeout(() => {
        setIsEnabled(true);
      }, 100);
    } else {
      setIsEnabled(true);
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => {
      const updated = prev.filter(r => r.id !== ruleId);
      saveMonitorRules(updated);
      return updated;
    });
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(prev => {
      const updated = prev.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r);
      saveMonitorRules(updated);
      return updated;
    });
  };

  const handleIntervalChange = (seconds: number) => {
    setInterval_(seconds);
    saveMonitorInterval(seconds);
  };

  const updateNotifySettings = (update: Partial<MonitorNotifySettings>) => {
    setNotifySettings_(prev => {
      const next = { ...prev, ...update };
      saveNotifySettings(next);
      return next;
    });
  };

  const handleTestDesktop = async () => {
    setDesktopTestResult('testing');
    const ok = await sendDesktopNotification(
      '🎮 Test Notification',
      'Server Monitor is working correctly!'
    );
    setDesktopTestResult(ok ? 'success' : 'failed');
    setTimeout(() => setDesktopTestResult(null), 3000);
  };

  const handleTestWebhook = async () => {
    if (!notifySettings.discordWebhookUrl) return;
    setDiscordTestResult('testing');
    const testMatch: MatchedServer = {
      serverKey: '127.0.0.1:27015', serverName: 'Test Server', mapName: 'ze_test_map',
      players: 32, maxPlayers: 64, matchedRule: 'Test Rule', matchedPattern: 'ze_*', matchedAt: new Date().toISOString(),
    };
    const ok = await sendDiscordWebhook(notifySettings.discordWebhookUrl, testMatch, notifySettings.alertTitle || undefined);
    setDiscordTestResult(ok ? 'success' : 'failed');
    setTimeout(() => setDiscordTestResult(null), 3000);
  };

  const handleTestServerChan = async () => {
    if (!notifySettings.serverChanKey) return;
    setServerChanTestResult('testing');
    const testMatch: MatchedServer = {
      serverKey: '127.0.0.1:27015', serverName: 'Test Server', mapName: 'ze_test_map',
      players: 32, maxPlayers: 64, matchedRule: 'Test Rule', matchedPattern: 'ze_*', matchedAt: new Date().toISOString(),
    };
    const ok = await sendServerChanNotification(notifySettings.serverChanKey, testMatch, notifySettings.alertTitle || undefined);
    setServerChanTestResult(ok ? 'success' : 'failed');
    setTimeout(() => setServerChanTestResult(null), 3000);
  };

  const handleTestCustomWebhook = async () => {
    if (!notifySettings.customWebhookUrl) return;
    setCustomWebhookTestResult('testing');
    const testMatch: MatchedServer = {
      serverKey: '127.0.0.1:27015', serverName: 'Test Server', mapName: 'ze_test_map',
      players: 32, maxPlayers: 64, matchedRule: 'Test Rule', matchedPattern: 'ze_*', matchedAt: new Date().toISOString(),
    };
    const customMsg = formatNotificationMessage(notifySettings.customMessageTemplate, testMatch);
    const ok = await sendCustomWebhook(notifySettings.customWebhookUrl, testMatch, customMsg);
    setCustomWebhookTestResult(ok ? 'success' : 'failed');
    setTimeout(() => setCustomWebhookTestResult(null), 3000);
  };

  // Format time
  const formatTime = (isoStr: string | null) => {
    if (!isoStr) return '--';
    const d = new Date(isoStr);
    return d.toLocaleTimeString();
  };

  const primaryColor = rgbaToCss(theme.colorRegions.primary);
  const secondaryColor = rgbaToCss(theme.colorRegions.secondary);

  // Remove a server from all rules' selectedServers
  const removeServerFromAllRules = (serverKey: string) => {
    setRules(prev => {
      const updated = prev.map(r => ({
        ...r,
        selectedServers: r.selectedServers.filter(s => s !== serverKey),
      }));
      saveMonitorRules(updated);
      return updated;
    });
  };

  // Collect all unique monitored servers from all rules
  const allMonitoredServers = useMemo(() => {
    const set = new Set<string>();
    for (const rule of rules) {
      for (const s of rule.selectedServers) set.add(s);
    }
    return Array.from(set);
  }, [rules]);

  // Fetch server details for monitored servers display
  const [monitoredServerInfo, setMonitoredServerInfo] = useState<Map<string, MonitoredServerDetails>>(new Map());
  
  // Refresh monitored server info via A2S when allMonitoredServers changes or after each check
  useEffect(() => {
    if (allMonitoredServers.length === 0) return;
    let cancelled = false;
    const fetchInfo = async () => {
      try {
        const infoMap = new Map<string, MonitoredServerDetails>();

        // Query ALL monitored servers via local A2S protocol
        for (const addr of allMonitoredServers) {
          const parsed = parseServerAddress(addr);
          if (!parsed) continue;
          const result = await queryServerA2S(parsed.ip, parsed.port);
          if (cancelled) return;
          if (result.success) {
            infoMap.set(addr, {
              name: result.name || addr,
              map: result.map_name || '--',
              players: result.real_players ?? result.players ?? 0,
              maxPlayers: result.max_players ?? 0,
              updatedAt: new Date().toLocaleTimeString(),
            });
          }
        }

        setMonitoredServerInfo(infoMap);
      } catch { /* ignore */ }
    };
    fetchInfo();
    return () => { cancelled = true; };
  }, [allMonitoredServers, status.lastCheckTime]); // re-fetch when check completes

  // Login suggestion dismissed state
  const [loginSuggestionDismissed, setLoginSuggestionDismissed] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6 pb-20">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
            >
              <BellIcon />
            </div>
            {t.monitorTitle}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">{t.monitorDesc}</p>
        </div>

        {/* Login Suggestion Banner (shown when not logged in) */}
        {!isLoggedIn && !loginSuggestionDismissed && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl flex items-start gap-3">
            <span className="text-2xl mt-0.5">💡</span>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">{t.monitorLoginSuggested}</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{t.monitorLoginSuggestedDesc}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => handleProviderLogin('steam')}
                  disabled={loginPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  style={{ backgroundColor: '#171a21' }}
                >
                  <SteamLoginIcon />
                  <span>{loginPending ? '...' : t.loginWithSteam}</span>
                </button>
                <button
                  onClick={() => handleProviderLogin('upkk')}
                  disabled={loginPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  style={{ backgroundColor: '#e74c3c' }}
                >
                  <UpkkLoginIcon />
                  <span>{loginPending ? '...' : t.loginWithUpkk}</span>
                </button>
                <button
                  onClick={() => handleProviderLogin('google')}
                  disabled={loginPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <GoogleLoginIcon />
                  <span>{loginPending ? '...' : t.loginWithGoogle}</span>
                </button>
                <button
                  onClick={() => handleProviderLogin('discord')}
                  disabled={loginPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  style={{ backgroundColor: '#5865F2' }}
                >
                  <DiscordLoginIcon />
                  <span>{loginPending ? '...' : t.loginWithDiscord}</span>
                </button>
              </div>
              {loginPending && (
                <p className="text-sm text-blue-500 mt-2 animate-pulse">
                  ⏳ {t.syncFavoritesHint}
                </p>
              )}
            </div>
            <button
              onClick={() => setLoginSuggestionDismissed(true)}
              className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors p-1"
            >
              <XMarkIcon />
            </button>
          </div>
        )}

        {/* Rules Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {t.monitorRules}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({rules.length})</span>
            </h2>
            <button
              onClick={() => setEditingRule(createDefaultRule())}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium shadow-lg shadow-blue-500/25"
            >
              <PlusIcon />
              {t.monitorAddRule}
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                <BellIcon />
              </div>
              <h3 className="text-gray-500 dark:text-gray-400 font-medium">{t.monitorNoRules}</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t.monitorNoRulesDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    rule.enabled
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                          rule.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${
                          rule.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{rule.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{`${rule.selectedServers.length} ${t.monitorServers}`}</span>
                          <span>•</span>
                          <span>{rule.mapPatterns.length} {t.monitorPatterns}</span>
                          {rule.minPlayers > 0 && (
                            <>
                              <span>•</span>
                              <span>≥{rule.minPlayers} {t.players}</span>
                            </>
                          )}
                          {(rule.requiredMatches ?? 1) > 1 && (
                            <>
                              <span>•</span>
                              <span>×{rule.requiredMatches} {t.monitorMatchTimes}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {rule.notifyDesktop && <DesktopIcon />}
                            {rule.notifyDiscord && <DiscordIcon />}
                            {rule.notifyServerChan && <ServerChanIcon />}
                          </span>
                          {rule.autoJoin && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 dark:text-green-400">▶ {t.monitorAutoJoin}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <button
                        onClick={() => setEditingRule({ ...rule })}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        title={t.monitorEditRule}
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title={t.monitorDeleteRule}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {/* Map patterns preview */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {rule.mapPatterns.map(p => (
                      <code key={p} className="px-2 py-0.5 bg-white dark:bg-gray-800 rounded text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        {p}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Matched Servers — real-time matches, independent of notification cooldown */}
        {(() => {
          // Deduplicate: keep only the latest match per serverKey
          const latestByServer = new Map<string, MatchedServer>();
          for (const m of currentMatches) {
            if (!latestByServer.has(m.serverKey)) {
              latestByServer.set(m.serverKey, m);
            }
          }
          const activeServers = Array.from(latestByServer.values());
          return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
                {t.monitorActiveMatches}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({activeServers.length})</span>
              </h2>
              {activeServers.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
                  {t.monitorNoActiveMatches}
                </div>
              ) : (
                <div className="space-y-2">
                  {activeServers.map(match => (
                    <div key={match.serverKey} className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{match.serverName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                          <span className="font-mono">{match.serverKey}</span>
                          <span>•</span>
                          <span>🗺️ {match.mapName}</span>
                          <span>•</span>
                          <span>👥 {match.players}/{match.maxPlayers}</span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const [ip, port] = match.serverKey.split(':');
                          const steamUrl = buildJoinUrl(ip, port);
                          try {
                            if (isTauriAvailable()) {
                              const { open } = await import('@tauri-apps/plugin-shell');
                              await open(steamUrl);
                            } else {
                              window.location.href = steamUrl;
                            }
                          } catch {
                            window.location.href = steamUrl;
                          }
                        }}
                        className="flex-shrink-0 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors shadow"
                      >
                        ▶ {t.monitorJoinServer}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Recent Matches — notification history */}
        {status.matchedServers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
              <CheckCircleIcon />
              {t.monitorRecentMatches}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({status.matchedServers.length})</span>
            </h2>
            <div className="space-y-2">
              {status.matchedServers.map((match, i) => (
                <div key={`${match.serverKey}-${match.matchedAt}-${i}`} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{match.serverName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{match.serverKey}</span>
                      <span>•</span>
                      <span>🗺️ {match.mapName}</span>
                      <span>•</span>
                      <span>👥 {match.players}/{match.maxPlayers}</span>
                      <span>•</span>
                      <span>📋 {match.matchedRule}</span>
                      <span>•</span>
                      <span>🕐 {formatTime(match.matchedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Control Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <PlayIcon />
              {t.monitorControl}
            </h2>
            <button
              onClick={toggleMonitor}
              disabled={rules.filter(r => r.enabled).length === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isEnabled
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              }`}
            >
              {isEnabled ? <StopIcon /> : <PlayIcon />}
              {isEnabled ? t.monitorStop : t.monitorStart}
            </button>
          </div>

          {/* Status Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{status.checkCount}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.monitorChecks}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{status.matchedServers.length}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.monitorMatches}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{formatTime(status.lastCheckTime)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.monitorLastCheck}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {isEnabled && countdown > 0 ? `${countdown}s` : '--'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.monitorNextCheck}</div>
            </div>
          </div>

          {/* Running status indicator */}
          {isEnabled && (
            <div className="flex items-center gap-2 text-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-green-600 dark:text-green-400 font-medium">{t.monitorRunning}</span>
            </div>
          )}

          {/* Error display */}
          {status.lastError && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
              {status.lastError}
            </div>
          )}

          {/* Interval Setting */}
          <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.monitorInterval}
            </label>
            <select
              value={interval}
              onChange={e => handleIntervalChange(parseInt(e.target.value, 10))}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value={30}>30 {t.monitorSeconds}</option>
              <option value={60}>1 {t.monitorMinute}</option>
              <option value={120}>2 {t.monitorMinutes}</option>
              <option value={300}>5 {t.monitorMinutes}</option>
              <option value={600}>10 {t.monitorMinutes}</option>
            </select>
          </div>

          {/* Global Notification Settings */}
          <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t.monitorNotifyChannels}
            </label>
            <div className="space-y-4">
              {/* Desktop Notification */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <DesktopIcon />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{t.monitorDesktopNotify}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.monitorDesktopNotifyDesc}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notifySettings.notifyDesktop && (
                    <button
                      onClick={handleTestDesktop}
                      disabled={desktopTestResult === 'testing'}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 ${
                        desktopTestResult === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : desktopTestResult === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      <TestIcon />
                      {desktopTestResult === 'testing' ? t.monitorTesting : desktopTestResult === 'success' ? '✓ ' + t.monitorTestSuccess : desktopTestResult === 'failed' ? '✗ ' + t.monitorTestFailed : t.monitorTest}
                    </button>
                  )}
                  <button
                    onClick={() => updateNotifySettings({ notifyDesktop: !notifySettings.notifyDesktop })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifySettings.notifyDesktop ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${
                      notifySettings.notifyDesktop ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Discord Webhook */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DiscordIcon />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{t.monitorDiscordNotify}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t.monitorDiscordNotifyDesc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => updateNotifySettings({ notifyDiscord: !notifySettings.notifyDiscord })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifySettings.notifyDiscord ? 'bg-[#5865F2]' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${
                      notifySettings.notifyDiscord ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {notifySettings.notifyDiscord && (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={notifySettings.discordWebhookUrl}
                      onChange={e => updateNotifySettings({ discordWebhookUrl: e.target.value })}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-[#5865F2]/20 focus:border-[#5865F2] transition-all"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {t.monitorDiscordHelp}
                    </div>
                    {notifySettings.discordWebhookUrl && (
                      <button
                        onClick={handleTestWebhook}
                        disabled={discordTestResult === 'testing'}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                          discordTestResult === 'success' ? 'bg-green-500 text-white'
                          : discordTestResult === 'failed' ? 'bg-red-500 text-white'
                          : 'bg-[#5865F2] text-white hover:bg-[#4752C4]'
                        }`}
                      >
                        <TestIcon />
                        {discordTestResult === 'testing' ? t.monitorTesting : discordTestResult === 'success' ? '✓ ' + t.monitorTestSuccess : discordTestResult === 'failed' ? '✗ ' + t.monitorTestFailed : t.monitorTestWebhook}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Server Chan */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ServerChanIcon />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{t.monitorServerChanNotify}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t.monitorServerChanNotifyDesc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => updateNotifySettings({ notifyServerChan: !notifySettings.notifyServerChan })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifySettings.notifyServerChan ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${
                      notifySettings.notifyServerChan ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {notifySettings.notifyServerChan && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={notifySettings.serverChanKey}
                      onChange={e => updateNotifySettings({ serverChanKey: e.target.value })}
                      placeholder="SCT..."
                      className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {t.monitorServerChanHelp}
                    </div>
                    {notifySettings.serverChanKey && (
                      <button
                        onClick={handleTestServerChan}
                        disabled={serverChanTestResult === 'testing'}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                          serverChanTestResult === 'success' ? 'bg-green-500 text-white'
                          : serverChanTestResult === 'failed' ? 'bg-red-500 text-white'
                          : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        <TestIcon />
                        {serverChanTestResult === 'testing' ? t.monitorTesting : serverChanTestResult === 'success' ? '✓ ' + t.monitorTestSuccess : serverChanTestResult === 'failed' ? '✗ ' + t.monitorTestFailed : t.monitorTest}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Custom Webhook */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CustomWebhookIcon />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{t.monitorCustomWebhookNotify}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t.monitorCustomWebhookNotifyDesc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => updateNotifySettings({ notifyCustomWebhook: !notifySettings.notifyCustomWebhook })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifySettings.notifyCustomWebhook ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${
                      notifySettings.notifyCustomWebhook ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {notifySettings.notifyCustomWebhook && (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={notifySettings.customWebhookUrl}
                      onChange={e => updateNotifySettings({ customWebhookUrl: e.target.value })}
                      placeholder="https://your-bot-server.com/webhook"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {t.monitorCustomWebhookHelp}
                    </div>
                    <details className="text-xs text-gray-500 dark:text-gray-400">
                      <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none">
                        {t.monitorCustomWebhookFieldsTitle}
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed whitespace-pre">
{`POST Content-Type: application/json
{
  "event": "map_alert",
  "server_name": "string",
  "map_name": "string",
  "players": number,
  "max_players": number,
  "address": "ip:port",
  "rule_name": "string",
  "matched_pattern": "string",
  "timestamp": "ISO 8601",
  "message": "string (formatted)"
}`}
                      </pre>
                    </details>
                    {notifySettings.customWebhookUrl && (
                      <button
                        onClick={handleTestCustomWebhook}
                        disabled={customWebhookTestResult === 'testing'}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                          customWebhookTestResult === 'success' ? 'bg-green-500 text-white'
                          : customWebhookTestResult === 'failed' ? 'bg-red-500 text-white'
                          : 'bg-purple-500 text-white hover:bg-purple-600'
                        }`}
                      >
                        <TestIcon />
                        {customWebhookTestResult === 'testing' ? t.monitorTesting : customWebhookTestResult === 'success' ? '✓ ' + t.monitorTestSuccess : customWebhookTestResult === 'failed' ? '✗ ' + t.monitorTestFailed : t.monitorTestWebhook}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Alert Title */}
            <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.monitorAlertTitle}
              </label>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t.monitorAlertTitleDesc}
              </div>
              <input
                type="text"
                value={notifySettings.alertTitle}
                onChange={e => updateNotifySettings({ alertTitle: e.target.value })}
                placeholder={DEFAULT_ALERT_TITLE}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MESSAGE_PLACEHOLDERS.map(p => {
                  const label = t[`monitorPlaceholder_${p.key.replace(/[{}]/g, '')}` as keyof typeof t] || p.desc;
                  return (
                    <span
                      key={p.key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title={label}
                      onClick={() => {
                        const current = notifySettings.alertTitle || '';
                        updateNotifySettings({ alertTitle: current + p.key });
                      }}
                    >
                      <code>{p.key}</code>
                      <span className="text-gray-400 dark:text-gray-500">{label}</span>
                    </span>
                  );
                })}
              </div>
              {notifySettings.alertTitle && (
                <div className="mt-2 p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.monitorMessagePreview}</div>
                  <div className="text-sm text-gray-900 dark:text-white break-all">
                    {formatNotificationMessage(notifySettings.alertTitle, {
                      serverKey: '127.0.0.1:27015', serverName: 'My Server', mapName: 'ze_example_map',
                      players: 32, maxPlayers: 64, matchedRule: 'My Rule', matchedPattern: 'ze_*', matchedAt: new Date().toISOString(),
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Message Template */}
            <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.monitorCustomMessageTemplate}
              </label>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t.monitorCustomMessageTemplateDesc}
              </div>
              <textarea
                value={notifySettings.customMessageTemplate}
                onChange={e => updateNotifySettings({ customMessageTemplate: e.target.value })}
                placeholder={DEFAULT_MESSAGE_TEMPLATE}
                rows={2}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MESSAGE_PLACEHOLDERS.map(p => {
                  const label = t[`monitorPlaceholder_${p.key.replace(/[{}]/g, '')}` as keyof typeof t] || p.desc;
                  return (
                    <span
                      key={p.key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title={label}
                      onClick={() => {
                        const current = notifySettings.customMessageTemplate || '';
                        updateNotifySettings({ customMessageTemplate: current + p.key });
                      }}
                    >
                      <code>{p.key}</code>
                      <span className="text-gray-400 dark:text-gray-500">{label}</span>
                    </span>
                  );
                })}
              </div>
              {notifySettings.customMessageTemplate && (
                <div className="mt-2 p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.monitorMessagePreview}</div>
                  <div className="text-sm text-gray-900 dark:text-white break-all">
                    {formatNotificationMessage(notifySettings.customMessageTemplate, {
                      serverKey: '127.0.0.1:27015', serverName: 'My Server', mapName: 'ze_example_map',
                      players: 32, maxPlayers: 64, matchedRule: 'My Rule', matchedPattern: 'ze_*', matchedAt: new Date().toISOString(),
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {allMonitoredServers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
              {t.monitorMonitoredServers}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({allMonitoredServers.length})</span>
            </h2>
            <div className="space-y-2">
              {allMonitoredServers.map(serverKey => {
                const info = monitoredServerInfo.get(serverKey);
                return (
                  <div key={serverKey} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {info ? info.name : serverKey}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="font-mono">{serverKey}</span>
                        {info && (
                          <>
                            <span>•</span>
                            <span>🗺️ {info.map}</span>
                            <span>•</span>
                            <span>👥 {info.players}/{info.maxPlayers}</span>
                            <span>•</span>
                            <span>🕐 {info.updatedAt}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeServerFromAllRules(serverKey)}
                      title={t.monitorRemoveServer}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex-shrink-0 ml-2"
                    >
                      <XMarkIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Rule Editor Modal */}
      {editingRule && (
        <RuleEditor
          rule={editingRule}
          onSave={handleSaveRule}
          onCancel={() => setEditingRule(null)}
          t={t}
        />
      )}

      {/* Start/Restart Monitoring Prompt */}
      {showStartPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-500">
              <PlayIcon />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {isEnabled ? t.monitorRestartPrompt : t.monitorStartPrompt}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {t.monitorStartPromptDesc}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStartPrompt(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t.monitorLater}
              </button>
              <button
                onClick={handleStartMonitorFromPrompt}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
              >
                {isEnabled ? t.monitorRestart : t.monitorStart}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Start/Stop Monitor Button */}
      <button
        onClick={toggleMonitor}
        disabled={rules.filter(r => r.enabled).length === 0}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:scale-105 active:scale-95 ${
          isEnabled
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
            : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-blue-500/30'
        }`}
      >
        {isEnabled ? (
          <>
            <StopIcon />
            <span>{t.monitorStop}</span>
            {countdown > 0 && <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-lg text-xs">{countdown}s</span>}
          </>
        ) : (
          <>
            <PlayIcon />
            <span>{t.monitorStart}</span>
          </>
        )}
        {isEnabled && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-400"></span>
          </span>
        )}
      </button>
    </div>
  );
}
