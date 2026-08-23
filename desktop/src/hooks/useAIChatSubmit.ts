import { useCallback, type Dispatch, type FormEvent, type MutableRefObject, type SetStateAction } from 'react';
import { AIChatRequestError, streamAIChat, type AIChatEvent } from '@/services/aiChat';
import { ensureWritableAIChatSession, type AIChatSessionState, type DesktopChatMessage } from '@/services/aiChatSessions';
import { detectDesktopToolIntent, probeServerAddress, type LocalLatencyResult } from '@/services/desktopTools';
import { createAIChatTurnMessages, selectAIChatRequestHistory } from '@/services/aiChatWorkspace';
import type { AIChatLabels } from '@/i18n/aiChat';
import { localToolStatus } from '@/services/aiChatPresentation';
import type { Language } from '@/store/i18n';
import type { DesktopToolRequest } from '@/services/desktopToolTypes';

interface SessionStatus {
  sessionId: string;
  text: string;
}

interface UseAIChatSubmitOptions {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  instructions: string;
  language: Language;
  labels: Pick<AIChatLabels, 'untitledChat' | 'processing' | 'failed'>;
  isLoggedIn: boolean;
  sendingSessionId: string | null;
  setSendingSessionId: Dispatch<SetStateAction<string | null>>;
  setSessionStatus: Dispatch<SetStateAction<SessionStatus | null>>;
  sessionState: AIChatSessionState;
  setSessionState: Dispatch<SetStateAction<AIChatSessionState>>;
  activeSession: AIChatSessionState['sessions'][number] | undefined;
  localToolRunning: boolean;
  setLocalToolRunning: Dispatch<SetStateAction<boolean>>;
  setLocalToolResults: Dispatch<SetStateAction<LocalLatencyResult[]>>;
  localToolOperationRef: MutableRefObject<number>;
  abortRef: MutableRefObject<AbortController | null>;
  clearTransientWorkspace: () => void;
  appendPromptMessages: (sessionId: string, prompt: string, messages: DesktopChatMessage[]) => void;
  updateMessages: (sessionId: string, update: (messages: DesktopChatMessage[]) => DesktopChatMessage[]) => void;
  eventHandler: (sessionId: string, assistantId: string, event: AIChatEvent) => void;
  handleJoinIntent: (
    request: Extract<DesktopToolRequest, { type: 'join_server' }>,
    signal: AbortSignal,
    sessionId: string,
    operationId: number,
    setSessionStatusText: (text: string) => void,
  ) => Promise<string>;
  measureActiveCandidates: (category?: string, signal?: AbortSignal) => Promise<LocalLatencyResult[]>;
  formatLocalLatencyContext: (results: LocalLatencyResult[], category?: string) => string;
  invalidate: () => Promise<void> | void;
}

export function useAIChatSubmit({
  input,
  setInput,
  instructions,
  language,
  labels,
  isLoggedIn,
  sendingSessionId,
  setSendingSessionId,
  setSessionStatus,
  sessionState,
  setSessionState,
  activeSession,
  localToolRunning,
  setLocalToolRunning,
  setLocalToolResults,
  localToolOperationRef,
  abortRef,
  clearTransientWorkspace,
  appendPromptMessages,
  updateMessages,
  eventHandler,
  handleJoinIntent,
  measureActiveCandidates,
  formatLocalLatencyContext,
  invalidate,
}: UseAIChatSubmitOptions) {
  return useCallback(async (event?: FormEvent) => {
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
    const timestamp = Date.now();
    const history = selectAIChatRequestHistory(targetSession.messages);
    const { userMessage, assistantPlaceholder } = createAIChatTurnMessages(
      timestamp,
      message,
      instructions,
      history,
    );
    const assistantId = assistantPlaceholder.id;
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
        const joinMessage = await handleJoinIntent(
          toolIntent,
          controller.signal,
          targetSessionId,
          localToolOperation!,
          text => setSessionStatus({ sessionId: targetSessionId, text }),
        );
        appendPromptMessages(targetSessionId, message, [
          userMessage,
          { id: assistantId, role: 'assistant', content: joinMessage },
        ]);
        return;
      }

      appendPromptMessages(targetSessionId, message, [
        userMessage,
        assistantPlaceholder,
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
  }, [
    activeSession, appendPromptMessages, clearTransientWorkspace, eventHandler, formatLocalLatencyContext,
    handleJoinIntent, input, instructions, invalidate, isLoggedIn, labels.failed, labels.processing,
    labels.untitledChat, language, localToolOperationRef, localToolRunning, measureActiveCandidates,
    sendingSessionId, sessionState, setLocalToolResults, setLocalToolRunning, setSessionState, updateMessages,
    abortRef, setInput, setSendingSessionId, setSessionStatus,
  ]);
}
