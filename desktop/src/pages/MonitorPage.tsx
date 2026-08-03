import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { rgbaToCss } from '@/store/themeUtils';
import { useI18n } from '@/hooks/useI18n';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { parseServerAddress, queryServerA2S } from '@/services/a2s';
import { useMonitorRuntime } from '@/hooks/useMonitorRuntime';
import type { ServerStatus } from '@/types';
import {
  type MonitorRule,
  type MatchedServer,
  type MonitorNotifySettings,
  saveMonitorRules,
  setMonitorInterval as saveMonitorInterval,
  loadNotifySettings,
  saveNotifySettings,
  createDefaultRule,
  sendDiscordWebhook,
  sendDesktopNotification,
  sendServerChanNotification,
  sendCustomWebhook,
  formatNotificationMessage,
  MESSAGE_PLACEHOLDERS,
  DEFAULT_MESSAGE_TEMPLATE,
  DEFAULT_ALERT_TITLE,
} from '@/services/monitor';

import {
  BellIcon,
  PlayIcon,
  StopIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  DiscordIcon,
  DesktopIcon,
  ServerChanIcon,
  CustomWebhookIcon,
  CheckCircleIcon,
  XMarkIcon,
  TestIcon,
  SteamLoginIcon,
  GoogleLoginIcon,
  DiscordLoginIcon,
  UpkkLoginIcon,
} from '@/components/monitor/MonitorIcons';
import { RuleEditor } from '@/components/monitor/RuleEditor';

const JoinServerConfirmModal = lazy(() => import('@/components/JoinServerConfirmModal').then(module => ({ default: module.JoinServerConfirmModal })));

// ============== Types ==============

interface MonitoredServerDetails {
  name: string;
  map: string;
  players: number;
  maxPlayers: number;
  updatedAt: string;
}

// ============== Rule Editor Modal ==============

// ============== Main Monitor Page ==============

export function MonitorPage() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    rules,
    setRules,
    interval,
    setInterval: setInterval_,
    isEnabled,
    setIsEnabled,
    status,
    setStatus,
    currentMatches,
    countdown,
    setCountdown,
  } = useMonitorRuntime();
  const [editingRule, setEditingRule] = useState<MonitorRule | null>(null);
  const [showStartPrompt, setShowStartPrompt] = useState(false);
  const [notifySettings, setNotifySettings_] = useState<MonitorNotifySettings>(() => loadNotifySettings());
  const [desktopTestResult, setDesktopTestResult] = useState<string | null>(null);
  const [discordTestResult, setDiscordTestResult] = useState<string | null>(null);
  const [serverChanTestResult, setServerChanTestResult] = useState<string | null>(null);
  const [customWebhookTestResult, setCustomWebhookTestResult] = useState<string | null>(null);
  const [joinTarget, setJoinTarget] = useState<ServerStatus | null>(null);
  const { isLoggedIn, loginPending, login } = useCloudAuth();
  const handleProviderLogin = login;

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
                        onClick={() => setJoinTarget(matchedServerToStatus(match))}
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

      {joinTarget && (
        <Suspense fallback={null}>
          <JoinServerConfirmModal server={joinTarget} onClose={() => setJoinTarget(null)} />
        </Suspense>
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

function matchedServerToStatus(match: MatchedServer): ServerStatus {
  const parsed = parseServerAddress(match.serverKey);
  return {
    name: match.serverName,
    ip: parsed?.ip ?? match.serverKey,
    port: parsed?.port ?? '',
    map_name: match.mapName,
    players: match.players,
    real_players: match.players,
    max_players: match.maxPlayers,
    online: true,
    is_online: true,
  } as ServerStatus;
}
