import { useCallback, useEffect, useState } from 'react';
import type { Translations } from '@/store/i18n';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { useFavoritesStore } from '@/hooks/useFavoritesStore';
import { getFavorites, type FavoriteServer } from '@/api';
import { parseServerAddress, queryServerA2S } from '@/services/a2s';
import type { MonitorRule } from '@/services/monitor';
import { BellIcon, XMarkIcon } from './MonitorIcons';

interface RuleEditorProps {
  rule: MonitorRule;
  onSave: (rule: MonitorRule) => void;
  onCancel: () => void;
  t: Translations;
}

function RuleEditor({ rule, onSave, onCancel, t }: RuleEditorProps) {
  const { isLoggedIn } = useCloudAuth();
  const [editRule, setEditRule] = useState<MonitorRule>({ ...rule });
  const [mapInput, setMapInput] = useState('');
  const [favoriteServers, setFavoriteServers] = useState<FavoriteServer[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [serverSearch, setServerSearch] = useState('');
  const [serverPage, setServerPage] = useState(1);
  const SERVERS_PER_PAGE = 10;
  const { favorites: localFavorites } = useFavoritesStore();
  const [localServerNames, setLocalServerNames] = useState<Record<string, string>>({});

  const loadFavorites = useCallback(() => {
    if (!isLoggedIn || favoritesLoaded || loadingFavorites) return;
    setLoadingFavorites(true);
    getFavorites(1, 100)
      .then(res => {
        setFavoriteServers(res.favorites || []);
        setFavoritesLoaded(true);
      })
      .catch(() => { setFavoritesLoaded(true); })
      .finally(() => setLoadingFavorites(false));
  }, [favoritesLoaded, isLoggedIn, loadingFavorites]);

  useEffect(() => {
    if (isLoggedIn && !favoritesLoaded) {
      const timer = window.setTimeout(() => loadFavorites(), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [favoritesLoaded, isLoggedIn, loadFavorites]);

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
        } catch { /* keep the address when A2S name resolution fails */ }
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
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {t.monitorAutoJoinWarning}
            </p>
          </div>

        </div>
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

export { RuleEditor };
