import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { createAIChatStreamCoalescer, type AIChatStreamCoalescer } from '@/services/aiChatStream';
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
  const labelsRef = useRef(labels);
  const coalescerRef = useRef<AIChatStreamCoalescer | null>(null);
  const streamTargetRef = useRef<{ sessionId: string; assistantId: string } | null>(null);

  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);

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

  useLayoutEffect(() => {
    const messageScroller = messageScrollRef.current;
    if (!messageScroller) return;
    messageScroller.scrollTo({ top: messageScroller.scrollHeight, behavior: 'smooth' });
  }, [activeMessages, activeStatus]);

  useEffect(() => () => {
    coalescerRef.current?.dispose();
    coalescerRef.current = null;
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

  const applyFlushedEvents = useCallback((sessionId: string, assistantId: string, events: AIChatEvent[]) => {
    if (events.length === 0) return;
    updateMessages(sessionId, current => {
      let next = current;
      for (const event of events) {
        next = updateAIChatMessage(next, assistantId, message => applyAIChatAssistantEvent(message, event));
      }
      return next;
    });
    for (const event of events) {
      const status = statusForAIChatEvent(event, labelsRef.current);
      if (!status) continue;
      setSessionStatus(status.text === null ? null : { sessionId, text: status.text });
      if (status.requireLogin) void invalidate();
    }
  }, [invalidate, updateMessages]);

  const setThinkingOpen = useCallback((id: string, open: boolean) => {
    if (!activeSessionId) return;
    updateMessages(activeSessionId, current => updateAIChatMessage(
      current,
      id,
      message => ({ ...message, thinkingOpen: open }),
    ), { persist: false });
  }, [activeSessionId, updateMessages]);

  const eventHandler = useCallback((sessionId: string, assistantId: string, event: AIChatEvent) => {
    const target = streamTargetRef.current;
    if (!coalescerRef.current || target?.sessionId !== sessionId || target.assistantId !== assistantId) {
      coalescerRef.current?.dispose();
      streamTargetRef.current = { sessionId, assistantId };
      coalescerRef.current = createAIChatStreamCoalescer({
        onFlush(events) {
          const active = streamTargetRef.current;
          if (!active) return;
          applyFlushedEvents(active.sessionId, active.assistantId, events);
        },
      });
    }
    coalescerRef.current.push(event);
  }, [applyFlushedEvents]);

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

  const stop = () => {
    coalescerRef.current?.flush();
    abortRef.current?.abort();
  };

  return {
    language, labels, isLoggedIn, isReady, sessionState, input, setInput, instructions, setInstructions,
    sendingSessionId, sidebarOpen, setSidebarOpen, joinTarget, setJoinTarget, joinCandidates, setJoinCandidates,
    joinLatency, localToolResults, setLocalToolResults, localToolRunning, messageScrollRef, activeSession, activeMessages,
    activeTurnCount, activeStatus, activeSessionSending, startNewSession, selectSession, deleteSession,
    requestJoin, setThinkingOpen, submit, stop,
  };
}
