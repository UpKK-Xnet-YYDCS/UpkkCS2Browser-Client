import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useAppActions } from '@/hooks/useAppSlices';
import { useTheme } from '@/hooks/useTheme';
import type { ColorRegion } from '@/store/theme';
import { useI18n } from '@/hooks/useI18n';
import type { Language } from '@/store/i18n';
import { languageLabels } from '@/store/i18nLabels';
import { getApiBaseUrl, XPROJ_USER_AGENT, getPrefetchPages, setPrefetchPages, getPrefetchDelay, setPrefetchDelay } from '@/api';
import { RGBAColorPicker } from '@/components/RGBAColorPicker';
import { useUpdateCheck } from '@/contexts/updateContext';
import { APP_VERSION } from '@/services/update';
import { relaunchDesktopApp } from '@/services/desktopRuntime';
import { clearCredentials } from '@/services/secureStorage';
import { clearPersistedCloudApiToken } from '@/services/cloudToken';
import { A2STestSection } from '@/components/settings/A2STestSection';
import { LatencySettingsSection } from '@/components/settings/LatencySettingsSection';
import { getSteamClient, setSteamClient } from '@/services/steamClient';
import { subscribeLog, getLogEntries } from '@/store/log';
import {
  type NotificationSound,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  getNotificationSound,
  setNotificationSound,
  playNotificationSound,
} from '@/services/toast';
import { ClearDataModal } from '@/components/settings/ClearDataModal';
import { OperationLogPanel } from '@/components/settings/OperationLogPanel';
import { NavigationLabelSetting } from '@/components/settings/NavigationLabelSetting';
import {
  SunIcon,
  MoonIcon,
  ImageIcon,
  PaletteIcon,
  RefreshIcon,
  TrashIcon,
  UpdateIcon,
  GlobeIcon,
  LogIcon,
} from '@/components/settings/SettingsIcons';

// Color region order for display
const colorRegionOrder: ColorRegion[] = ['primary', 'secondary', 'accent', 'header', 'sidebar', 'background', 'text'];

// Default auto-refresh interval in seconds (matches HomePage.tsx)
const DEFAULT_AUTO_REFRESH_INTERVAL = 60;

// Globe/Language icon
export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'colors' | 'logs'>('general');
  const logEntries = useSyncExternalStore(subscribeLog, getLogEntries);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('autoRefreshInterval');
    return saved ? parseInt(saved, 10) : DEFAULT_AUTO_REFRESH_INTERVAL;
  });
  const [prefetchPagesCount, setPrefetchPagesCount] = useState(getPrefetchPages);
  const [prefetchDelayMs, setPrefetchDelayMs] = useState(getPrefetchDelay);
  const [saved, setSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [updateCheckStatus, setUpdateCheckStatus] = useState<'idle' | 'checking' | 'upToDate' | 'error'>('idle');
  const [soundEnabled, setSoundEnabled] = useState(isNotificationSoundEnabled);
  const [soundType, setSoundType] = useState<NotificationSound>(getNotificationSound);
  const [steamClient, setSteamClientState] = useState<'steam' | 'steamchina'>(getSteamClient);
  const { setApiBaseUrl, fetchServers } = useAppActions();
  const theme = useTheme();
  const { t, language, setLanguage, isAuto } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { triggerManualCheck, isChecking: isUpdateChecking } = useUpdateCheck();

  // Sync steam client state when changed externally (e.g. header button)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'steamClient') {
        const val = e.newValue as 'steam' | 'steamchina';
        if (val === 'steam' || val === 'steamchina') setSteamClientState(val);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Auto-scroll log list to bottom when new entries arrive
  useEffect(() => {
    if (activeTab === 'logs') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logEntries, activeTab]);

  // Predefined auto refresh options
  const PREDEFINED_VALUES = [0, 30, 60, 120, 300, 600];
  const isCustomInterval = !PREDEFINED_VALUES.includes(autoRefreshInterval);
  const [showCustomInput, setShowCustomInput] = useState(isCustomInterval);
  const [customInputValue, setCustomInputValue] = useState(isCustomInterval ? String(autoRefreshInterval) : '');

  // Get auto refresh options with translations
  const getAutoRefreshOptions = () => [
    { value: 0, label: t.refreshOff },
    { value: 30, label: t.refreshSeconds },
    { value: 60, label: t.refreshMinute },
    { value: 120, label: t.refresh2Minutes },
    { value: 300, label: t.refresh5Minutes },
    { value: 600, label: t.refresh10Minutes },
    { value: -1, label: t.refreshCustom },
  ];

  // Get color region labels with translations
  const getColorRegionLabel = (region: ColorRegion): string => {
    const labels: Record<ColorRegion, string> = {
      primary: t.primaryColor,
      secondary: t.secondaryColor,
      accent: t.accentColor,
      header: t.headerColor,
      sidebar: t.sidebarColor,
      background: t.backgroundColor,
      text: t.textColor,
    };
    return labels[region];
  };

  // Save auto refresh interval to localStorage
  useEffect(() => {
    localStorage.setItem('autoRefreshInterval', autoRefreshInterval.toString());
  }, [autoRefreshInterval]);

  // Handle manual update check
  const handleCheckForUpdates = async () => {
    setUpdateCheckStatus('checking');
    try {
      const result = await triggerManualCheck();
      if (result.hasUpdate) {
        // Modal will be shown by UpdateProvider
        setUpdateCheckStatus('idle');
      } else if (result.error) {
        setUpdateCheckStatus('error');
        setTimeout(() => setUpdateCheckStatus('idle'), 3000);
      } else {
        setUpdateCheckStatus('upToDate');
        setTimeout(() => setUpdateCheckStatus('idle'), 3000);
      }
    } catch {
      setUpdateCheckStatus('error');
      setTimeout(() => setUpdateCheckStatus('idle'), 3000);
    }
  };

  const handleSave = () => {
    setApiBaseUrl(apiUrl);
    fetchServers(1);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Clear all app data and restart
  const handleClearDataAndRestart = async () => {
    setIsClearing(true);
    try {
      await clearPersistedCloudApiToken();

      // Clear all localStorage data
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB if any - await all deletions
      if (window.indexedDB && window.indexedDB.databases) {
        const databases = await window.indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              return new Promise<void>((resolve, reject) => {
                const request = window.indexedDB.deleteDatabase(db.name!);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
                request.onblocked = () => resolve(); // Proceed even if blocked
              });
            }
            return Promise.resolve();
          })
        );
      }
      
      // Clear encrypted credentials file
      await clearCredentials();
      
      // Restart the application
      await relaunchDesktopApp();
    } catch (error) {
      console.error('Failed to clear data and restart:', error);
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        theme.setBackgroundImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearBackground = () => {
    theme.setBackgroundImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6 pb-20">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.settings}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t.settingsDesc}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'general'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.generalSettings}
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'appearance'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.appearance}
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'colors'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <PaletteIcon />
            {t.colorPalette}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <LogIcon />
            {t.operationLog}
          </button>
        </div>
        
        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          {activeTab === 'general' ? (
            <div className="space-y-6">
              {/* Language Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <GlobeIcon />
                  {t.languageSettings}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.languageLabel}
                    </label>
                    <select
                      value={isAuto ? 'auto' : language}
                      onChange={(e) => setLanguage(e.target.value as Language | 'auto')}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="auto">{t.languageAuto}</option>
                      <option value="en">{languageLabels['en']}</option>
                      <option value="ja">{languageLabels['ja']}</option>
                      <option value="zh-CN">{languageLabels['zh-CN']}</option>
                      <option value="zh-TW">{languageLabels['zh-TW']}</option>
                      <option value="ko">{languageLabels['ko']}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* API Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t.apiSettings}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.apiServerAddress}
                    </label>
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://servers.upkk.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t.apiServerHint}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto Refresh Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <RefreshIcon />
                  {t.autoRefresh}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.refreshInterval}
                    </label>
                    <select
                      value={showCustomInput ? -1 : autoRefreshInterval}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val === -1) {
                          setShowCustomInput(true);
                          const defaultCustom = autoRefreshInterval > 0 ? autoRefreshInterval : 60;
                          setCustomInputValue(String(defaultCustom));
                          setAutoRefreshInterval(defaultCustom);
                        } else {
                          setShowCustomInput(false);
                          setAutoRefreshInterval(val);
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      {getAutoRefreshOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {showCustomInput && (
                      <div className="mt-3 flex items-center gap-3">
                        <input
                          type="number"
                          min="10"
                          step="1"
                          value={customInputValue}
                          onChange={(e) => {
                            const raw = e.target.value;
                            // Only allow integers
                            if (raw === '' || /^\d+$/.test(raw)) {
                              setCustomInputValue(raw);
                              const num = parseInt(raw, 10);
                              if (!isNaN(num) && num >= 10) {
                                setAutoRefreshInterval(num);
                              }
                            }
                          }}
                          onBlur={() => {
                            const num = parseInt(customInputValue, 10);
                            if (isNaN(num) || num < 10) {
                              setCustomInputValue('10');
                              setAutoRefreshInterval(10);
                            } else {
                              const intVal = Math.floor(num);
                              setCustomInputValue(String(intVal));
                              setAutoRefreshInterval(intVal);
                            }
                          }}
                          className="w-32 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          placeholder="60"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t.refreshCustomSeconds}</span>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {showCustomInput ? t.refreshCustomHint : t.refreshIntervalHint}
                    </p>
                  </div>
                  {autoRefreshInterval > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                        <RefreshIcon />
                        {t.autoRefreshEnabled} {showCustomInput ? `${autoRefreshInterval} ${t.refreshCustomSeconds}` : getAutoRefreshOptions().find(o => o.value === autoRefreshInterval)?.label}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Page Prefetch Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t.prefetchPages}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.prefetchPagesDesc}
                    </label>
                    <select
                      value={prefetchPagesCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setPrefetchPagesCount(val);
                        setPrefetchPages(val);
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value={0}>{t.prefetchOff}</option>
                      <option value={1}>1{t.prefetchPagesOption}</option>
                      <option value={3}>3{t.prefetchPagesOption}</option>
                      <option value={5}>5{t.prefetchPagesOption}</option>
                      <option value={10}>10{t.prefetchPagesOption}</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {t.prefetchPagesHint}
                    </p>
                  </div>
                  {prefetchPagesCount > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {t.prefetchEnabled} {prefetchPagesCount}{t.prefetchPagesOption}
                      </p>
                    </div>
                  )}
                  {prefetchPagesCount > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t.prefetchDelayDesc}
                      </label>
                      <select
                        value={prefetchDelayMs}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setPrefetchDelayMs(val);
                          setPrefetchDelay(val);
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      >
                        <option value={50}>50ms</option>
                        <option value={100}>100ms</option>
                        <option value={150}>150ms</option>
                        <option value={200}>200ms</option>
                        <option value={300}>300ms</option>
                      </select>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t.prefetchDelayHint}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <LatencySettingsSection />

              {/* Update Check Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <UpdateIcon />
                  {t.checkForUpdates}
                </h3>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-blue-800 dark:text-blue-300">
                        {t.updateCurrentVersion}: v{APP_VERSION}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono break-all">
                        UA: {XPROJ_USER_AGENT}
                      </p>
                      {updateCheckStatus === 'upToDate' && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                          ✓ {t.noUpdatesAvailable}
                        </p>
                      )}
                      {updateCheckStatus === 'error' && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          ✗ {t.updateCheckFailed}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={isUpdateChecking || updateCheckStatus === 'checking'}
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {(isUpdateChecking || updateCheckStatus === 'checking') ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {t.checkingForUpdates}
                        </>
                      ) : (
                        <>
                          <UpdateIcon />
                          {t.checkForUpdates}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Clear Data Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrashIcon />
                  {t.dataManagement}
                </h3>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-red-800 dark:text-red-300">{t.clearData}</p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {t.clearDataDesc}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <TrashIcon />
                      {t.clearDataBtn}
                    </button>
                  </div>
                </div>
              </div>

              <A2STestSection />

              {/* Notification Sound Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  {t.notificationSound}
                </h3>
                <div className="space-y-4">
                  {/* Sound On/Off Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{t.notificationSoundEnabled}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t.notificationSoundEnabledDesc}</p>
                    </div>
                    <button
                      onClick={() => {
                        const newVal = !soundEnabled;
                        setSoundEnabled(newVal);
                        setNotificationSoundEnabled(newVal);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        soundEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                        soundEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Sound Type Selection */}
                  {soundEnabled && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t.notificationSoundType}</p>
                      <div className="flex gap-2 flex-wrap">
                        {(['chime', 'bubble', 'bell'] as NotificationSound[]).map(sound => (
                          <button
                            key={sound}
                            onClick={() => {
                              setSoundType(sound);
                              setNotificationSound(sound);
                              playNotificationSound(sound);
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                              soundType === sound
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                            }`}
                          >
                            <span>{sound === 'chime' ? '🔔' : sound === 'bubble' ? '💧' : '🔊'}</span>
                            {t[`soundType_${sound}` as keyof typeof t]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Steam Client Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.steamClientSetting}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t.steamClientSettingDesc}</p>
                <div className="flex gap-2 flex-wrap">
                  {(['steam', 'steamchina'] as const).map(option => (
                    <button
                      key={option}
                      onClick={() => {
                        setSteamClientState(option);
                        setSteamClient(option);
                        window.dispatchEvent(new StorageEvent('storage', { key: 'steamClient', newValue: option }));
                      }}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                        steamClient === option
                          ? option === 'steam'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                          : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 border border-gray-200 dark:border-gray-500'
                      }`}
                    >
                      <span>{option === 'steam' ? '🌐' : '🇨🇳'}</span>
                      {option === 'steam' ? t.steamInternational : t.steamChina}
                    </button>
                  ))}
                </div>
                {steamClient === 'steamchina' && (
                  <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                    {t.steamSwitchToChinaWarning}
                  </p>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSave}
                  className={`px-6 py-3 text-sm font-medium text-white rounded-xl transition-all shadow-md hover:shadow-lg ${
                    saved 
                      ? 'bg-green-500' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                  }`}
                >
                  {saved ? t.saved : t.saveSettings}
                </button>
              </div>
            </div>
          ) : activeTab === 'appearance' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  {theme.darkMode ? <MoonIcon /> : <SunIcon />}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t.darkMode}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.darkModeDesc}</p>
                  </div>
                </div>
                <button
                  onClick={() => theme.setDarkMode(!theme.darkMode)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    theme.darkMode ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      theme.darkMode ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <NavigationLabelSetting />
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{t.glassEffect}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.glassEffectDesc}</p>
                </div>
                <button
                  onClick={() => theme.setGlassEffect(!theme.glassEffect)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    theme.glassEffect ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      theme.glassEffect ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Background Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t.backgroundImage}
                </label>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  >
                    <ImageIcon />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {theme.backgroundImage ? t.changeImage : t.selectImage}
                    </span>
                  </button>
                  {theme.backgroundImage && (
                    <button
                      onClick={handleClearBackground}
                      className="px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      {t.clearBackground}
                    </button>
                  )}
                </div>
                {theme.backgroundImage && (
                  <div className="mt-3 h-32 rounded-xl overflow-hidden">
                    <img
                      src={theme.backgroundImage}
                      alt="Background preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Background Opacity */}
              {theme.backgroundImage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t.backgroundOpacity}: {theme.backgroundOpacity}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={theme.backgroundOpacity}
                    onChange={(e) => theme.setBackgroundOpacity(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              )}

              {/* Reset Theme */}
              <button
                onClick={theme.resetTheme}
                className="w-full py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
              >
                {t.resetAppearance}
              </button>
            </div>
          ) : activeTab === 'colors' ? (
            <div className="space-y-4">
              {/* Colors Tab - RGBA Color Pickers for each region */}
              <div className="flex items-center gap-2 mb-6">
                <PaletteIcon />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{t.multiRegionPalette}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.multiRegionPaletteDesc}</p>
                </div>
              </div>

              {colorRegionOrder.map((region) => (
                <RGBAColorPicker
                  key={region}
                  label={getColorRegionLabel(region)}
                  color={theme.colorRegions[region]}
                  onChange={(color) => theme.setColorRegion(region, color)}
                  onReset={() => theme.resetColorRegion(region)}
                />
              ))}

              {/* Reset All Colors */}
              <button
                onClick={theme.resetTheme}
                className="w-full py-3 mt-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
              >
                {t.resetAllColors}
              </button>
            </div>
          ) : (
            <OperationLogPanel entries={logEntries} endRef={logEndRef} t={t} />
          )}
        </div>

        {/* App Info */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>{t.appVersion}</p>
          <p className="mt-1">{t.basedOn}</p>
        </div>
      </div>
      
      <ClearDataModal
        open={showClearConfirm}
        isClearing={isClearing}
        t={t}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={handleClearDataAndRestart}
      />
    </div>
  );
}
