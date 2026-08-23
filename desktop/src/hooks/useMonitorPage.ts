import { useMemo, useState } from 'react';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { useMonitorRuntime } from '@/hooks/useMonitorRuntime';
import { useMonitoredServerInfo } from '@/hooks/useMonitoredServerInfo';
import { useNotifyChannelTests } from '@/hooks/useNotifyChannelTests';
import {
  loadNotifySettings,
  setMonitorInterval as saveMonitorInterval,
  saveMonitorRules,
  saveNotifySettings,
  type MonitorNotifySettings,
  type MonitorRule,
} from '@/services/monitor';
import { collectMonitoredServerKeys, formatMonitorClock } from '@/services/monitorPresentation';
import type { ServerStatus } from '@/types';

export type { MonitoredServerDetails } from '@/hooks/useMonitoredServerInfo';

export function useMonitorPage() {
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
    setCountdown,
  } = useMonitorRuntime();
  const [editingRule, setEditingRule] = useState<MonitorRule | null>(null);
  const [showStartPrompt, setShowStartPrompt] = useState(false);
  const [notifySettings, setNotifySettings_] = useState<MonitorNotifySettings>(() => loadNotifySettings());
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

  const {
    desktopTestResult,
    discordTestResult,
    serverChanTestResult,
    customWebhookTestResult,
    handleTestDesktop,
    handleTestWebhook,
    handleTestServerChan,
    handleTestCustomWebhook,
  } = useNotifyChannelTests(notifySettings);

  // Collect all unique monitored servers from all rules
  const allMonitoredServers = useMemo(() => collectMonitoredServerKeys(rules), [rules]);
  const monitoredServerInfo = useMonitoredServerInfo(allMonitoredServers, status.lastCheckTime);

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

  // Login suggestion dismissed state
  const [loginSuggestionDismissed, setLoginSuggestionDismissed] = useState(false);

  return {
    rules, setRules, interval, isEnabled, status, currentMatches,
    editingRule, setEditingRule, showStartPrompt, setShowStartPrompt,
    notifySettings, desktopTestResult, discordTestResult, serverChanTestResult, customWebhookTestResult,
    joinTarget, setJoinTarget, isLoggedIn, loginPending, handleProviderLogin,
    toggleMonitor, handleSaveRule, handleStartMonitorFromPrompt, handleDeleteRule, handleToggleRule,
    handleIntervalChange, updateNotifySettings, handleTestDesktop, handleTestWebhook,
    handleTestServerChan, handleTestCustomWebhook, formatTime: formatMonitorClock, removeServerFromAllRules,
    allMonitoredServers, monitoredServerInfo, loginSuggestionDismissed, setLoginSuggestionDismissed,
  };
}
