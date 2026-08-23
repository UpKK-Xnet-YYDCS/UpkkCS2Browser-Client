import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  countAIChatTurns,
  deleteAIChatSessionState,
  loadAIChatSessionState,
  renameAIChatSessionFromMessage,
  saveAIChatSessionState,
  selectAIChatSessionState,
  startAIChatSessionState,
  updateAIChatSessionMessages,
  type AIChatSessionState,
  type DesktopChatMessage,
} from '@/services/aiChatSessions';
import { getChatStorage } from '@/services/aiChatPresentation';

interface UseAIChatSessionsOptions {
  untitledChat: string;
  sendingSessionId: string | null;
  onClearTransientWorkspace: () => void;
}

export function useAIChatSessions({
  untitledChat,
  sendingSessionId,
  onClearTransientWorkspace,
}: UseAIChatSessionsOptions) {
  const [sessionState, setSessionState] = useState<AIChatSessionState>(() => (
    loadAIChatSessionState(getChatStorage(), untitledChat)
  ));
  const sessionStateRef = useRef(sessionState);

  const activeSession = useMemo(() => (
    sessionState.sessions.find(session => session.id === sessionState.activeSessionId)
      ?? sessionState.sessions[0]
  ), [sessionState.activeSessionId, sessionState.sessions]);
  const activeMessages = useMemo(() => activeSession?.messages ?? [], [activeSession]);
  const activeTurnCount = countAIChatTurns(activeMessages);

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
    setSessionState(current => startAIChatSessionState(current, untitledChat));
    onClearTransientWorkspace();
  }, [onClearTransientWorkspace, untitledChat]);

  const selectSession = useCallback((sessionId: string) => {
    setSessionState(current => selectAIChatSessionState(current, sessionId));
    onClearTransientWorkspace();
  }, [onClearTransientWorkspace]);

  const deleteSession = useCallback((sessionId: string) => {
    if (sessionId === sendingSessionId) return;
    const deletingActiveSession = sessionState.activeSessionId === sessionId;
    setSessionState(current => deleteAIChatSessionState(current, sessionId, untitledChat));
    if (deletingActiveSession) onClearTransientWorkspace();
  }, [onClearTransientWorkspace, sendingSessionId, sessionState.activeSessionId, untitledChat]);

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
        untitledChat,
      );
      return {
        ...current,
        sessions: updateAIChatSessionMessages(renamed, sessionId, existing => [...existing, ...messages]),
      };
    });
  }, [untitledChat]);

  return {
    sessionState,
    setSessionState,
    activeSession,
    activeMessages,
    activeTurnCount,
    updateMessages,
    startNewSession,
    selectSession,
    deleteSession,
    appendPromptMessages,
  };
}
