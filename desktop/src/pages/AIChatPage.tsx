import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Bot, Menu, RotateCcw, Send, Settings2, Square } from 'lucide-react';
import { AIChatSessionSidebar } from '@/components/AIChatSessionSidebar';
import { CloudLoginPanel } from '@/components/CloudLoginPanel';
import { AIMessageList } from '@/components/AIMessageList';
import { AILocalTools } from '@/components/AILocalTools';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { useI18n } from '@/hooks/useI18n';
import {
  AIChatRequestError,
  fetchRecommendedServers,
  streamAIChat,
  type AIChatEvent,
  type RecommendedServer,
} from '@/services/aiChat';
import {
  AI_CHAT_MAX_SESSIONS,
  countAIChatTurns,
  createAIChatSession,
  ensureWritableAIChatSession,
  isAIChatSessionFull,
  loadAIChatSessionState,
  renameAIChatSessionFromMessage,
  saveAIChatSessionState,
  updateAIChatSessionMessages,
  type AIChatSessionState,
  type AIChatSessionStorage,
  type DesktopChatMessage,
} from '@/services/aiChatSessions';
import type { ServerStatus } from '@/types';
import type { Language } from '@/store/i18n';
import {
  detectDesktopToolIntent,
  formatLocalLatencyContext,
  probeRecommendedServers,
  probeServerAddress,
  recommendedServerToStatus,
  resolveJoinTarget,
  type DesktopToolRequest,
  type LocalLatencyResult,
} from '@/services/desktopTools';
import { getAIChatLabels } from './aiLabels';

const INSTRUCTIONS_KEY = 'xproj.ai-chat.instructions.v1';
const JoinServerConfirmModal = lazy(() => import('@/components/JoinServerConfirmModal').then(module => ({ default: module.JoinServerConfirmModal })));
const JoinServerPickerModal = lazy(() => import('@/components/JoinServerPickerModal').then(module => ({ default: module.JoinServerPickerModal })));

interface SessionStatus {
  sessionId: string;
  text: string;
}

export function AIChatPage() {
  const { language } = useI18n();
  const labels = useMemo(() => getAIChatLabels(language), [language]);
  const { isLoggedIn, isReady, invalidate } = useCloudAuth();
  const [sessionState, setSessionState] = useState<AIChatSessionState>(() => (
    loadAIChatSessionState(getChatStorage(), labels.untitledChat)
  ));
  const [input, setInput] = useState('');
  const [instructions, setInstructions] = useState(() => readInstructions());
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [sendingSessionId, setSendingSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [servers, setServers] = useState<RecommendedServer[]>([]);
  const [lastSelectedServer, setLastSelectedServer] = useState<ServerStatus | null>(null);
  const [joinTarget, setJoinTarget] = useState<ServerStatus | null>(null);
  const [joinCandidates, setJoinCandidates] = useState<ServerStatus[]>([]);
  const [joinLatency, setJoinLatency] = useState<number | undefined>();
  const [localToolResults, setLocalToolResults] = useState<LocalLatencyResult[]>([]);
  const [localToolRunning, setLocalToolRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const localToolOperationRef = useRef(0);
  const sessionStateRef = useRef(sessionState);
  const endRef = useRef<HTMLDivElement | null>(null);

  const activeSession = useMemo(() => (
    sessionState.sessions.find(session => session.id === sessionState.activeSessionId)
      ?? sessionState.sessions[0]
  ), [sessionState.activeSessionId, sessionState.sessions]);
  const activeMessages = useMemo(() => activeSession?.messages ?? [], [activeSession]);
  const activeTurnCount = countAIChatTurns(activeMessages);
  const activeStatus = sessionStatus?.sessionId === activeSession?.id ? sessionStatus.text : '';
  const activeSessionSending = sendingSessionId === activeSession?.id;

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveAIChatSessionState(getChatStorage(), sessionState);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [sessionState]);

  useEffect(() => () => {
    saveAIChatSessionState(getChatStorage(), sessionStateRef.current);
  }, []);

  useEffect(() => {
    try {
      if (instructions.trim()) localStorage.setItem(INSTRUCTIONS_KEY, instructions);
      else localStorage.removeItem(INSTRUCTIONS_KEY);
    } catch {
      // Custom instructions remain available in memory when storage is unavailable.
    }
  }, [instructions]);

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeMessages, activeStatus]);

  useEffect(() => () => {
    abortRef.current?.abort();
    localToolOperationRef.current += 1;
  }, []);

  const joinableServers = useMemo(() => {
    const byAddress = new Map<string, ServerStatus>();
    for (const server of servers) {
      const status = recommendedServerToStatus(server);
      byAddress.set(`${server.ip}:${server.port}`.toLowerCase(), status);
    }
    for (const result of localToolResults) {
      const status = recommendedServerToStatus(result.server, result.latencyMs);
      byAddress.set(`${result.server.ip}:${result.server.port}`.toLowerCase(), status);
    }
    return Array.from(byAddress.values());
  }, [localToolResults, servers]);

  const clearTransientWorkspace = useCallback(() => {
    localToolOperationRef.current += 1;
    setLocalToolResults([]);
    setLocalToolRunning(false);
    setSessionStatus(null);
    setJoinCandidates([]);
  }, []);

  const updateMessages = useCallback((
    sessionId: string,
    update: (messages: DesktopChatMessage[]) => DesktopChatMessage[],
  ) => {
    setSessionState(current => ({
      ...current,
      sessions: updateAIChatSessionMessages(current.sessions, sessionId, update),
    }));
  }, []);

  const startNewSession = useCallback(() => {
    const session = createAIChatSession(labels.untitledChat);
    setSessionState(current => ({
      sessions: [session, ...current.sessions].slice(0, AI_CHAT_MAX_SESSIONS),
      activeSessionId: session.id,
    }));
    setInput('');
    setSidebarOpen(false);
    clearTransientWorkspace();
  }, [clearTransientWorkspace, labels.untitledChat]);

  const selectSession = useCallback((sessionId: string) => {
    setSessionState(current => current.activeSessionId === sessionId
      ? current
      : { ...current, activeSessionId: sessionId });
    setInput('');
    setSidebarOpen(false);
    clearTransientWorkspace();
  }, [clearTransientWorkspace]);

  const deleteSession = useCallback((sessionId: string) => {
    if (sessionId === sendingSessionId) return;
    const deletingActiveSession = sessionState.activeSessionId === sessionId;
    setSessionState(current => {
      const index = current.sessions.findIndex(session => session.id === sessionId);
      if (index < 0) return current;
      const remaining = current.sessions.filter(session => session.id !== sessionId);
      if (remaining.length === 0) {
        const replacement = createAIChatSession(labels.untitledChat);
        return { sessions: [replacement], activeSessionId: replacement.id };
      }
      const nextActiveId = current.activeSessionId === sessionId
        ? remaining[Math.min(index, remaining.length - 1)].id
        : current.activeSessionId;
      return { sessions: remaining, activeSessionId: nextActiveId };
    });
    if (deletingActiveSession) clearTransientWorkspace();
  }, [clearTransientWorkspace, labels.untitledChat, sendingSessionId, sessionState.activeSessionId]);

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
    sessionId: string,
    operationId: number,
  ): Promise<string> => {
    let resolution = request.address
      ? { kind: 'unresolved' } as const
      : resolveJoinTarget(request, joinableServers, lastSelectedServer);
    if (request.address) {
      setSessionStatus({ sessionId, text: localToolStatus(language, 'resolving') });
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

  const updateAssistant = useCallback((sessionId: string, id: string, event: AIChatEvent) => {
    updateMessages(sessionId, current => current.map(message => {
      if (message.id !== id) return message;
      switch (event.type) {
        case 'message': return { ...message, content: message.content + String(event.content ?? ''), pending: false };
        case 'thinking': return { ...message, thinking: (message.thinking ?? '') + String(event.content ?? ''), thinkingOpen: true, pending: false };
        case 'reset': return { ...message, content: '', thinking: '', thinkingOpen: false, pending: true };
        case 'complete': return { ...message, pending: false, thinkingOpen: false };
        case 'retry': return { ...message, pending: true };
        default: return message;
      }
    }));
  }, [updateMessages]);

  const eventHandler = useCallback((sessionId: string, assistantId: string, event: AIChatEvent) => {
    updateAssistant(sessionId, assistantId, event);
    switch (event.type) {
      case 'queue': setSessionStatus({ sessionId, text: `${labels.queue}${typeof event.position === 'number' ? ` #${event.position}` : ''}` }); break;
      case 'retrieving': setSessionStatus({ sessionId, text: labels.retrieving }); break;
      case 'processing':
      case 'http_status': setSessionStatus({ sessionId, text: labels.processing }); break;
      case 'thinking': setSessionStatus({ sessionId, text: labels.thinking }); break;
      case 'message': setSessionStatus(null); break;
      case 'retry': setSessionStatus({ sessionId, text: formatRetry(labels.retrying, Number(event.attempt || 1), Number(event.max || 5)) }); break;
      case 'grounding': setSessionStatus({ sessionId, text: labels.grounding }); break;
      case 'action': setSessionStatus({ sessionId, text: `${labels.action}${event.status ? `: ${String(event.status)}` : ''}` }); break;
      case 'complete': setSessionStatus(null); break;
      case 'error':
        setSessionStatus({ sessionId, text: event.error || labels.failed });
        if (event.require_login) void invalidate();
        break;
      case 'timeout': setSessionStatus({ sessionId, text: event.error || labels.failed }); break;
      case 'reset': setSessionStatus({ sessionId, text: labels.processing }); break;
    }
  }, [invalidate, labels, updateAssistant]);

  const appendPromptMessages = useCallback((
    sessionId: string,
    prompt: string,
    messages: DesktopChatMessage[],
  ) => {
    setSessionState(current => {
      const renamed = renameAIChatSessionFromMessage(
        current.sessions,
        sessionId,
        prompt,
        labels.untitledChat,
      );
      return {
        ...current,
        sessions: updateAIChatSessionMessages(renamed, sessionId, existing => [...existing, ...messages]),
      };
    });
  }, [labels.untitledChat]);

  const submit = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message || sendingSessionId || localToolRunning || !isLoggedIn || !activeSession) return;

    const writable = ensureWritableAIChatSession(sessionState, labels.untitledChat);
    const targetSession = writable.session;
    const targetSessionId = targetSession.id;
    if (writable.rolledOver) {
      setSessionState(writable.state);
      clearTransientWorkspace();
    }

    const toolIntent = detectDesktopToolIntent(message);
    const history = targetSession.messages
      .filter(item => item.id !== 'welcome' && !item.pending && item.content.trim())
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));
    const timestamp = Date.now();
    const assistantId = `assistant-${timestamp}`;
    const userMessage = { id: `user-${timestamp}`, role: 'user' as const, content: message };
    setInput('');
    setSendingSessionId(targetSessionId);
    setSessionStatus({ sessionId: targetSessionId, text: labels.processing });
    const controller = new AbortController();
    abortRef.current = controller;
    const localToolOperation = toolIntent ? ++localToolOperationRef.current : null;
    if (toolIntent?.type === 'find_lowest_latency' || toolIntent?.type === 'test_latency') {
      setLocalToolRunning(true);
    }

    try {
      if (toolIntent?.type === 'join_server') {
        const joinMessage = await handleJoinIntent(toolIntent, controller.signal, targetSessionId, localToolOperation!);
        appendPromptMessages(targetSessionId, message, [
          userMessage,
          { id: assistantId, role: 'assistant', content: joinMessage },
        ]);
        return;
      }

      appendPromptMessages(targetSessionId, message, [
        userMessage,
        { id: assistantId, role: 'assistant', content: '', pending: true, thinkingOpen: true },
      ]);

      let context = '';
      if (toolIntent?.type === 'find_lowest_latency') {
        setSessionStatus({ sessionId: targetSessionId, text: localToolStatus(language, 'measuring') });
        const results = await measureActiveCandidates(toolIntent.category, controller.signal);
        if (localToolOperationRef.current === localToolOperation) setLocalToolResults(results);
        context = formatLocalLatencyContext(results, toolIntent.category);
      } else if (toolIntent?.type === 'test_latency') {
        setSessionStatus({ sessionId: targetSessionId, text: localToolStatus(language, 'measuring') });
        const result = await probeServerAddress(toolIntent.address, { signal: controller.signal });
        if (localToolOperationRef.current === localToolOperation) setLocalToolResults([result]);
        context = formatLocalLatencyContext([result]);
      }

      await streamAIChat(
        { message, history, instructions: instructions.trim(), language, context },
        { signal: controller.signal, onEvent: aiEvent => eventHandler(targetSessionId, assistantId, aiEvent) },
      );
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        if (reason instanceof AIChatRequestError && reason.requireLogin) await invalidate();
        const failure = reason instanceof Error ? reason.message : labels.failed;
        updateMessages(targetSessionId, current => current.map(item => item.id === assistantId
          ? { ...item, content: item.content || failure, pending: false, thinkingOpen: false }
          : item));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (localToolOperation !== null && localToolOperationRef.current === localToolOperation) {
        setLocalToolRunning(false);
      }
      setSendingSessionId(current => current === targetSessionId ? null : current);
      setSessionStatus(current => current?.sessionId === targetSessionId ? null : current);
      updateMessages(targetSessionId, current => current.map(item => item.id === assistantId
        ? { ...item, pending: false }
        : item));
    }
  }, [activeSession, appendPromptMessages, clearTransientWorkspace, eventHandler, handleJoinIntent, input, instructions, invalidate, isLoggedIn, labels.failed, labels.processing, labels.untitledChat, language, localToolRunning, measureActiveCandidates, sendingSessionId, sessionState, updateMessages]);

  const stop = () => abortRef.current?.abort();

  if (!isReady) return <div className="grid flex-1 place-items-center text-sm text-gray-500">{labels.loading}</div>;
  if (!isLoggedIn) {
    return (
      <CloudLoginPanel
        icon={<Bot className="h-9 w-9" aria-hidden="true" />}
        title={labels.loginTitle}
        description={labels.loginBody}
      />
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-white dark:bg-gray-950">
      <AIChatSessionSidebar
        sessions={sessionState.sessions}
        activeSessionId={sessionState.activeSessionId}
        language={language}
        labels={labels}
        open={sidebarOpen}
        sendingSessionId={sendingSessionId}
        onNew={startNewSession}
        onSelect={selectSession}
        onDelete={deleteSession}
        onClose={() => setSidebarOpen(false)}
      />

      <section className="flex min-w-0 flex-1 flex-col bg-white dark:bg-gray-950">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-3 dark:border-gray-800 sm:px-4">
          <button type="button" onClick={() => setSidebarOpen(true)} title={labels.openSidebar} aria-label={labels.openSidebar} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden">
            <Menu className="h-4 w-4" />
          </button>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Bot className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{activeSession?.title || labels.untitledChat}</h1>
            <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{labels.title} · {labels.turnCount.replace('%d', String(activeTurnCount))}</p>
          </div>
          <details className="group relative">
            <summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" title={labels.instructions} aria-label={labels.instructions}>
              <Settings2 className="h-4 w-4" />
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-[min(340px,calc(100vw-2rem))] rounded-md border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-200" htmlFor="ai-chat-instructions">{labels.instructions}</label>
              <textarea id="ai-chat-instructions" value={instructions} onChange={event => setInstructions(event.target.value)} placeholder={labels.instructionsPlaceholder} maxLength={1200} rows={4} className="mt-2 w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 outline-none focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
              <button type="button" onClick={() => setInstructions('')} disabled={!instructions || Boolean(sendingSessionId)} className="mt-2 flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-700">
                <RotateCcw className="h-3.5 w-3.5" />{labels.resetInstructions}
              </button>
            </div>
          </details>
        </header>

        <AIMessageList
          messages={activeMessages}
          labels={labels}
          status={activeStatus}
          endRef={endRef}
          prompts={labels.prompts}
          promptDisabled={Boolean(sendingSessionId)}
          onPrompt={setInput}
          setThinkingOpen={(id, open) => updateMessages(activeSession.id, current => current.map(item => item.id === id ? { ...item, thinkingOpen: open } : item))}
        />

        <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-950 sm:px-5">
          <div className="mx-auto w-full max-w-[820px]">
            {isAIChatSessionFull(activeMessages) && (
              <p className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{labels.sessionLimit}</p>
            )}
            <AILocalTools
              language={language}
              running={localToolRunning && activeSessionSending}
              results={localToolResults}
              onJoin={requestJoin}
              onClear={() => setLocalToolResults([])}
            />
            <form onSubmit={event => void submit(event)} className="mt-2 flex min-h-12 items-end gap-2 rounded-lg border border-gray-300 bg-gray-50 p-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900">
              <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={labels.placeholder} disabled={Boolean(sendingSessionId) && !activeSessionSending} maxLength={4000} rows={1} className="max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-gray-900 outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-white" />
              {activeSessionSending ? (
                <button type="button" onClick={stop} title={labels.stop} aria-label={labels.stop} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-red-600 text-white hover:bg-red-700"><Square className="h-3.5 w-3.5 fill-current" /></button>
              ) : (
                <button type="submit" disabled={!input.trim() || Boolean(sendingSessionId) || localToolRunning} title={labels.send} aria-label={labels.send} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"><Send className="h-4 w-4" /></button>
              )}
            </form>
          </div>
        </div>
      </section>

      {joinTarget && (
        <Suspense fallback={null}>
          <JoinServerConfirmModal server={joinTarget} latencyMs={joinLatency} onClose={() => setJoinTarget(null)} />
        </Suspense>
      )}
      {joinCandidates.length > 0 && (
        <Suspense fallback={null}>
          <JoinServerPickerModal
            candidates={joinCandidates}
            onSelect={server => { setJoinCandidates([]); requestJoin(server); }}
            onClose={() => setJoinCandidates([])}
          />
        </Suspense>
      )}
    </div>
  );
}

function readInstructions(): string {
  try {
    return localStorage.getItem(INSTRUCTIONS_KEY) ?? '';
  } catch {
    return '';
  }
}

function getChatStorage(): AIChatSessionStorage | undefined {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}

function formatRetry(template: string, attempt: number, max: number): string {
  return template.replace('%d', String(attempt)).replace('%d', String(max));
}

const localStatuses = {
  en: { measuring: 'Measuring local A2S latency...', failed: 'Local latency test failed', resolving: 'Verifying server...', confirmJoin: 'Choose how you want to join in the confirmation dialog.', chooseServer: 'Several servers matched. Choose one from the server list.', unresolved: 'I could not identify one server. Use its full name or address.', unavailable: 'This address cannot be joined because local A2S verification failed: %s' },
  ja: { measuring: 'ローカルA2Sレイテンシを測定中...', failed: 'ローカル測定に失敗しました', resolving: 'サーバーを確認中...', confirmJoin: '確認ダイアログで接続方法を選択してください。', chooseServer: '複数のサーバーが一致しました。リストから1つ選択してください。', unresolved: 'サーバーを1つに特定できませんでした。完全な名前またはアドレスを入力してください。', unavailable: 'ローカルA2S確認に失敗したため接続できません: %s' },
  'zh-CN': { measuring: '正在测试本地 A2S 延迟...', failed: '本地延迟测试失败', resolving: '正在验证服务器...', confirmJoin: '请在确认对话框中选择加入方式。', chooseServer: '匹配到多个服务器，请从候选列表中选择一个。', unresolved: '无法唯一确定服务器，请使用完整名称或地址。', unavailable: '本机 A2S 验证失败，不能加入该地址：%s' },
  'zh-TW': { measuring: '正在測試本機 A2S 延遲...', failed: '本機延遲測試失敗', resolving: '正在驗證伺服器...', confirmJoin: '請在確認對話框中選擇加入方式。', chooseServer: '匹配到多個伺服器，請從候選清單中選擇一個。', unresolved: '無法唯一確定伺服器，請使用完整名稱或位址。', unavailable: '本機 A2S 驗證失敗，不能加入該位址：%s' },
  ko: { measuring: '로컬 A2S 지연 측정 중...', failed: '로컬 지연 테스트 실패', resolving: '서버 확인 중...', confirmJoin: '확인 대화상자에서 접속 방법을 선택하세요.', chooseServer: '여러 서버가 일치합니다. 후보 목록에서 하나를 선택하세요.', unresolved: '서버를 하나로 식별할 수 없습니다. 전체 이름이나 주소를 입력하세요.', unavailable: '로컬 A2S 확인에 실패하여 이 주소에 접속할 수 없습니다: %s' },
} as const;

function localToolStatus(language: Language, key: keyof typeof localStatuses.en): string {
  return localStatuses[language][key];
}

function formatLocalStatus(language: Language, key: keyof typeof localStatuses.en, detail: string): string {
  return localToolStatus(language, key).replace('%s', detail);
}
