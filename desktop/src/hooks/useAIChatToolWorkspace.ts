import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchRecommendedServers,
  type RecommendedServer,
} from '@/services/aiChat';
import type { Language } from '@/store/i18n';
import type { ServerStatus } from '@/types';
import {
  formatLocalLatencyContext,
  probeRecommendedServers,
  probeServerAddress,
  recommendedServerToStatus,
  resolveJoinTarget,
  type DesktopToolRequest,
  type LocalLatencyResult,
} from '@/services/desktopTools';
import { collectJoinableServers } from '@/services/aiChatWorkspace';
import { formatLocalStatus, localToolStatus } from '@/services/aiChatPresentation';

interface UseAIChatToolWorkspaceOptions {
  language: Language;
  isLoggedIn: boolean;
}

export function useAIChatToolWorkspace({
  language,
  isLoggedIn,
}: UseAIChatToolWorkspaceOptions) {
  const [servers, setServers] = useState<RecommendedServer[]>([]);
  const [lastSelectedServer, setLastSelectedServer] = useState<ServerStatus | null>(null);
  const [joinTarget, setJoinTarget] = useState<ServerStatus | null>(null);
  const [joinCandidates, setJoinCandidates] = useState<ServerStatus[]>([]);
  const [joinLatency, setJoinLatency] = useState<number | undefined>();
  const [localToolResults, setLocalToolResults] = useState<LocalLatencyResult[]>([]);
  const [localToolRunning, setLocalToolRunning] = useState(false);
  const localToolOperationRef = useRef(0);

  const joinableServers = useMemo(
    () => collectJoinableServers(servers, localToolResults),
    [localToolResults, servers],
  );

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchRecommendedServers(language, controller.signal)
        .then(setServers)
        .catch(() => setServers([]));
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isLoggedIn, language]);

  const clearTransientWorkspace = useCallback(() => {
    localToolOperationRef.current += 1;
    setLocalToolResults([]);
    setLocalToolRunning(false);
    setJoinCandidates([]);
  }, []);

  const measureActiveCandidates = useCallback(async (category?: string, signal?: AbortSignal) => {
    let candidates: RecommendedServer[];
    if (category?.trim()) {
      try {
        candidates = await fetchRecommendedServers(language, signal, undefined, category);
      } catch {
        candidates = [];
      }
    } else {
      candidates = servers.length > 0 ? servers : await fetchRecommendedServers(language, signal);
      if (servers.length === 0) setServers(candidates);
    }
    return probeRecommendedServers(candidates, { signal });
  }, [language, servers]);

  const requestJoin = useCallback((server: ServerStatus, latencyMs?: number) => {
    setLastSelectedServer(server);
    setJoinLatency(latencyMs ?? server.local_latency_ms);
    setJoinTarget(server);
  }, []);

  const handleJoinIntent = useCallback(async (
    request: Extract<DesktopToolRequest, { type: 'join_server' }>,
    signal: AbortSignal,
    _sessionId: string,
    operationId: number,
    setSessionStatusText: (text: string) => void,
  ): Promise<string> => {
    let resolution = request.address
      ? { kind: 'unresolved' } as const
      : resolveJoinTarget(request, joinableServers, lastSelectedServer);
    if (request.address) {
      setSessionStatusText(localToolStatus(language, 'resolving'));
      try {
        const result = await probeServerAddress(request.address, { signal });
        if (localToolOperationRef.current === operationId) setLocalToolResults([result]);
        if (!result.success) {
          return formatLocalStatus(language, 'unavailable', result.error || request.address);
        }
        const server = recommendedServerToStatus(result.server, result.latencyMs);
        resolution = { kind: 'resolved', server };
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === 'AbortError') throw reason;
        return formatLocalStatus(language, 'unavailable', reason instanceof Error ? reason.message : request.address);
      }
    }
    if (resolution.kind === 'ambiguous') {
      setJoinCandidates(resolution.candidates);
      return localToolStatus(language, 'chooseServer');
    }
    if (resolution.kind !== 'resolved') return localToolStatus(language, 'unresolved');
    requestJoin(resolution.server, resolution.server.local_latency_ms);
    return localToolStatus(language, 'confirmJoin');
  }, [joinableServers, language, lastSelectedServer, requestJoin]);

  return {
    servers,
    setServers,
    joinTarget,
    setJoinTarget,
    joinCandidates,
    setJoinCandidates,
    joinLatency,
    localToolResults,
    setLocalToolResults,
    localToolRunning,
    setLocalToolRunning,
    localToolOperationRef,
    joinableServers,
    clearTransientWorkspace,
    measureActiveCandidates,
    requestJoin,
    handleJoinIntent,
    formatLocalLatencyContext,
  };
}
