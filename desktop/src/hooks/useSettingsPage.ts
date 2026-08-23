import { useEffect, useRef, useState } from 'react';
import { useUpdateCheck } from '@/contexts/updateContext';
import { useAppActions } from '@/hooks/useAppSlices';
import { useI18n } from '@/hooks/useI18n';
import { getApiBaseUrl, getPrefetchDelay, getPrefetchPages } from '@/api/client';
import { clearPersistedCloudApiToken } from '@/services/cloudToken';
import { relaunchDesktopApp } from '@/services/desktopRuntime';
import { clearCredentials } from '@/services/secureStorage';
import { getSteamClient, readSteamClientFromStorageEvent } from '@/services/steamClient';
import {
  getNotificationSound,
  isNotificationSoundEnabled,
  type NotificationSound,
} from '@/services/toast';
import { DEFAULT_CUSTOM_AUTO_REFRESH_SECONDS, isPredefinedAutoRefreshValue } from '@/services/autoRefreshPolicy';
import { SETTINGS_SAVE_FEEDBACK_MS, resolveManualUpdateCheckStatus } from '@/services/settingsUpdateCheck';
import { clearDesktopLocalData } from '@/services/settingsClearData';

const DEFAULT_AUTO_REFRESH_INTERVAL = DEFAULT_CUSTOM_AUTO_REFRESH_SECONDS;

export type SettingsTab = 'general' | 'appearance' | 'colors' | 'logs';

export function useSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
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
  const { t, language, setLanguage, isAuto } = useI18n();
  const { triggerManualCheck, isChecking: isUpdateChecking } = useUpdateCheck();

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const next = readSteamClientFromStorageEvent(e.key, e.newValue);
      if (next) setSteamClientState(next);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isCustomInterval = !isPredefinedAutoRefreshValue(autoRefreshInterval);
  const [showCustomInput, setShowCustomInput] = useState(isCustomInterval);
  const [customInputValue, setCustomInputValue] = useState(isCustomInterval ? String(autoRefreshInterval) : '');

  const getAutoRefreshOptions = () => [
    { value: 0, label: t.refreshOff },
    { value: 30, label: t.refreshSeconds },
    { value: 60, label: t.refreshMinute },
    { value: 120, label: t.refresh2Minutes },
    { value: 300, label: t.refresh5Minutes },
    { value: 600, label: t.refresh10Minutes },
    { value: -1, label: t.refreshCustom },
  ];

  useEffect(() => {
    localStorage.setItem('autoRefreshInterval', autoRefreshInterval.toString());
  }, [autoRefreshInterval]);

  const handleCheckForUpdates = async () => {
    setUpdateCheckStatus('checking');
    try {
      const next = resolveManualUpdateCheckStatus(await triggerManualCheck());
      setUpdateCheckStatus(next.status);
      if (next.resetMs !== null) {
        setTimeout(() => setUpdateCheckStatus('idle'), next.resetMs);
      }
    } catch {
      const next = resolveManualUpdateCheckStatus(null);
      setUpdateCheckStatus(next.status);
      if (next.resetMs !== null) {
        setTimeout(() => setUpdateCheckStatus('idle'), next.resetMs);
      }
    }
  };

  const handleSave = () => {
    setApiBaseUrl(apiUrl);
    fetchServers(1);
    setSaved(true);
    setTimeout(() => setSaved(false), SETTINGS_SAVE_FEEDBACK_MS);
  };

  const handleClearDataAndRestart = async () => {
    setIsClearing(true);
    try {
      await clearDesktopLocalData({
        clearPersistedCloudApiToken,
        localStorage,
        sessionStorage,
        indexedDB: window.indexedDB,
        clearCredentials,
      });
      await relaunchDesktopApp();
    } catch (error) {
      console.error('Failed to clear data and restart:', error);
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  return {
    t,
    language,
    isAuto,
    setLanguage,
    activeTab,
    setActiveTab,
    logEndRef,
    apiUrl,
    setApiUrl,
    autoRefreshInterval,
    setAutoRefreshInterval,
    prefetchPagesCount,
    setPrefetchPagesCount,
    prefetchDelayMs,
    setPrefetchDelayMs,
    saved,
    showClearConfirm,
    setShowClearConfirm,
    isClearing,
    updateCheckStatus,
    soundEnabled,
    setSoundEnabled,
    soundType,
    setSoundType,
    steamClient,
    setSteamClientState,
    isUpdateChecking,
    showCustomInput,
    setShowCustomInput,
    customInputValue,
    setCustomInputValue,
    getAutoRefreshOptions,
    handleCheckForUpdates,
    handleSave,
    handleClearDataAndRestart,
  };
}

