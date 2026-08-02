import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useI18n } from '@/hooks/useI18n';
import { showToast } from '@/services/toast';
import { MonitorRuntimeContext, type MonitorRuntimeValue } from './monitorRuntimeContext';
import {
  MONITOR_RULES_KEY,
  getMonitorEnabled,
  getMonitorInterval,
  loadMonitorRules,
  loadMonitorRulesFromFile,
  performMonitorCheck,
  setMonitorEnabled,
  type MatchedServer,
  type MonitorRule,
  type MonitorStatus,
} from '@/services/monitor';

const initialStatus: MonitorStatus = {
  isRunning: false,
  lastCheckTime: null,
  nextCheckTime: null,
  matchedServers: [],
  checkCount: 0,
  errorCount: 0,
  lastError: null,
};

export function MonitorRuntimeProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [rules, setRules] = useState<MonitorRule[]>(() => loadMonitorRules());
  const [interval, setInterval] = useState(() => getMonitorInterval());
  const [isEnabled, setIsEnabled] = useState(() => {
    const savedRules = loadMonitorRules();
    return getMonitorEnabled() && savedRules.some(rule => rule.enabled && rule.mapPatterns.length > 0);
  });
  const [status, setStatus] = useState<MonitorStatus>(initialStatus);
  const [currentMatches, setCurrentMatches] = useState<MatchedServer[]>([]);
  const [countdown, setCountdown] = useState(0);
  const rulesRef = useRef(rules);
  const runCheckRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);

  useEffect(() => {
    setMonitorEnabled(isEnabled);
  }, [isEnabled]);

  useEffect(() => {
    let cancelled = false;
    void loadMonitorRulesFromFile().then(fileRules => {
      if (cancelled || fileRules === null) return;
      setRules(fileRules);
      try {
        localStorage.setItem(MONITOR_RULES_KEY, JSON.stringify(fileRules));
      } catch {
        // The in-memory rules remain authoritative for this session.
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const runCheck = useCallback(async () => {
    const currentRules = rulesRef.current;
    if (currentRules.length === 0) return;
    setStatus(previous => ({ ...previous, isRunning: true }));
    const result = await performMonitorCheck(currentRules);
    setCurrentMatches([...result.currentMatches].reverse());
    setStatus(previous => ({
      ...previous,
      isRunning: false,
      lastCheckTime: new Date().toISOString(),
      checkCount: previous.checkCount + 1,
      errorCount: result.error ? previous.errorCount + 1 : previous.errorCount,
      lastError: result.error,
      matchedServers: result.matched.length > 0
        ? [...result.matched, ...previous.matchedServers].slice(0, 30)
        : previous.matchedServers,
    }));

    if (result.autoJoined) {
      setIsEnabled(false);
      setCountdown(0);
      showToast(
        `> ${t.monitorAutoJoin}`,
        `${result.autoJoined.serverName} - ${result.autoJoined.mapName}`,
        'info',
        8000,
      );
    }
  }, [t.monitorAutoJoin]);

  useEffect(() => {
    runCheckRef.current = runCheck;
  }, [runCheck]);

  const hasEnabledRules = rules.some(rule => rule.enabled && rule.mapPatterns.length > 0);
  useEffect(() => {
    if (!isEnabled || !hasEnabledRules) {
      return undefined;
    }

    let cancelled = false;
    let checkTimer: ReturnType<typeof setTimeout> | null = null;
    let countdownTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      setCountdown(interval);
      setStatus(previous => ({
        ...previous,
        nextCheckTime: new Date(Date.now() + interval * 1000).toISOString(),
      }));
      const tick = () => {
        if (cancelled) return;
        setCountdown(previous => {
          if (previous <= 1) return 0;
          countdownTimer = setTimeout(tick, 1000);
          return previous - 1;
        });
      };
      countdownTimer = setTimeout(tick, 1000);
      checkTimer = setTimeout(() => {
        if (cancelled) return;
        void runCheckRef.current().finally(() => {
          if (!cancelled) scheduleNext();
        });
      }, interval * 1000);
    };

    const initialTimer = setTimeout(() => {
      if (cancelled) return;
      void runCheckRef.current().finally(() => {
        if (!cancelled) scheduleNext();
      });
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      if (checkTimer) clearTimeout(checkTimer);
      if (countdownTimer) clearTimeout(countdownTimer);
    };
  }, [hasEnabledRules, interval, isEnabled]);

  const value = useMemo<MonitorRuntimeValue>(() => ({
    rules,
    setRules,
    interval,
    setInterval,
    isEnabled,
    setIsEnabled,
    status,
    setStatus,
    currentMatches,
    countdown,
    setCountdown,
  }), [countdown, currentMatches, interval, isEnabled, rules, status]);

  return <MonitorRuntimeContext.Provider value={value}>{children}</MonitorRuntimeContext.Provider>;
}
