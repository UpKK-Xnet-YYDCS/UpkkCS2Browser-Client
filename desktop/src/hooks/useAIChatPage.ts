import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCloudAuth } from '@/hooks/useCloudAuth';
import { useI18n } from '@/hooks/useI18n';
import type { AIChatEvent } from '@/services/aiChat';
import { statusForAIChatEvent } from '@/services/aiChatWorkspace';
import { getAIChatLabels } from '@/i18n/aiChat';
import {
  INSTRUCTIONS_KEY,
  applyAIChatAssistantEvent,
  readInstructions,
  updateAIChatMessage,
} from '@/services/aiChatPresentation';
import { useAIChatSessions } from '@/hooks/useAIChatSessions';
import { useAIChatSubmit } from '@/hooks/useAIChatSubmit';
import { useAIChatToolWorkspace } from '@/hooks/useAIChatToolWorkspace';

interface SessionStatus {
  sessionId: string;
  text: string;
}

export function useAIChatPage() {
  const { language } = useI18n();
  const labels = useMemo(() => getAIChatLabels(language), [language]);
  const { isLoggedIn, isReady, invalidate } = useCloudAuth();
  const [input, setInput] = useState('');
  const [instructions, setInstructions] = useState(() => readInstructions());
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [sendingSessionId, setSendingSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);

  const workspace = useAIChatToolWorkspace({ language, isLoggedIn });
  const {
    clearTransientWorkspace: clearWorkspace,
    localToolRunning,
    localToolOperationRef,
    setLocalToolRunning,
    setLocalToolResults,
    handleJoinIntent,
    measureActiveCandidates,
    formatLocalLatencyContext,
    joinTarget,
    setJoinTarget,
    joinCandidates,
    setJoinCandidates,
    joinLatency,
    localToolResults,
    requestJoin,
  } = workspace;

  const clearTransientWorkspace = useCallback(() => {
    clearWorkspace();
    setSessionStatus(null);
  }, [clearWorkspace]);

  const {
    sessionState,
    setSessionState,
    activeSession,
    activeMessages,
    activeTurnCount,
    updateMessages,
    startNewSession: startSession,
    selectSession: selectSessionState,
    deleteSession,
    appendPromptMessages,
  } = useAIChatSessions({
    untitledChat: labels.untitledChat,
    sendingSessionId,
    onClearTransientWorkspace: clearTransientWorkspace,
  });

  const activeStatus = sessionStatus?.sessionId === activeSession?.id ? sessionStatus.text : '';
  const activeSessionSending = sendingSessionId === activeSession?.id;
  const activeSessionId = activeSession?.id;

  useEffect(() => {
    try {
      if (instructions.trim()) localStorage.setItem(INSTRUCTIONS_KEY, instructions);
      else localStorage.removeItem(INSTRUCTIONS_KEY);
    } catch {
      // Custom instructions remain available in memory when storage is unavailable.
    }
  }, [instructions]);

  useEffect(() => {
    const messageScroller = messageScrollRef.current;
    if (!messageScroller) return;
    messageScroller.scrollTo({ top: messageScroller.scrollHeight, behavior: 'smooth' });
  }, [activeMessages, activeStatus]);

  useEffect(() => () => {
    abortRef.current?.abort();
    localToolOperationRef.current += 1;
  }, [localToolOperationRef]);

  const startNewSession = useCallback(() => {
    startSession();
    setInput('');
    setSidebarOpen(false);
  }, [startSession]);

  const selectSession = useCallback((sessionId: string) => {
    selectSessionState(sessionId);
    setInput('');
    setSidebarOpen(false);
  }, [selectSessionState]);

  const updateAssistant = useCallback((sessionId: string, id: string, event: AIChatEvent) => {
    updateMessages(sessionId, current => updateAIChatMessage(
      current,
      id,
      message => applyAIChatAssistantEvent(message, event),
    ));
  }, [updateMessages]);

  const setThinkingOpen = useCallback((id: string, open: boolean) => {
    if (!activeSessionId) return;
    updateMessages(activeSessionId, current => updateAIChatMessage(
      current,
      id,
      message => ({ ...message, thinkingOpen: open }),
    ));
  }, [activeSessionId, updateMessages]);

  const eventHandler = useCallback((sessionId: string, assistantId: string, event: AIChatEvent) => {
    updateAssistant(sessionId, assistantId, event);
    const status = statusForAIChatEvent(event, labels);
    if (!status) return;
    setSessionStatus(status.text === null ? null : { sessionId, text: status.text });
    if (status.requireLogin) void invalidate();
  }, [invalidate, labels, updateAssistant]);

  const submit = useAIChatSubmit({
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
  });

  const stop = () => abortRef.current?.abort();

  return {
    language, labels, isLoggedIn, isReady, sessionState, input, setInput, instructions, setInstructions,
    sendingSessionId, sidebarOpen, setSidebarOpen, joinTarget, setJoinTarget, joinCandidates, setJoinCandidates,
    joinLatency, localToolResults, setLocalToolResults, localToolRunning, messageScrollRef, activeSession, activeMessages,
    activeTurnCount, activeStatus, activeSessionSending, startNewSession, selectSession, deleteSession,
    requestJoin, setThinkingOpen, submit, stop,
  };
}
