import {useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {useCloudAuth} from '@/hooks/useCloudAuth';
import {useI18n} from '@/hooks/useI18n';
import {useCloudAI} from '@/hooks/useCloudAI';
import {useAIChatToolWorkspace} from '@/hooks/useAIChatToolWorkspace';
import {getAIChatLabels} from '@/i18n/aiChat';
import {getAICloudLabels} from '@/i18n/aiCloud';
import {getChatStorage, INSTRUCTIONS_KEY} from '@/services/aiChatPresentation';
import {loadReadOnlyAIChatHistory, countAIChatTurns} from '@/services/aiChatSessions';
import {detectDesktopToolIntent, probeServerAddress} from '@/services/desktopTools';
import {getApiBaseUrl} from '@/api/client';
import type {ServerStatus} from '@/types';
import {localToolStatus} from '@/services/aiChatPresentation';

export function useAIChatPage() {
  const {language} = useI18n();
  const labels = useMemo(() => getAIChatLabels(language), [language]);
  const cloudLabels = getAICloudLabels(language);
  const {isLoggedIn, isReady, authStatus} = useCloudAuth();
  const accountKey = isLoggedIn ? `${getApiBaseUrl()}:${authStatus.user?.id}` : '';
  const cloud = useCloudAI(accountKey, language);
  const [input, setInput] = useState('');
  const [preference, setPreference] = useState({key: '', value: ''});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [legacyId, setLegacyId] = useState('');
  const [localStatus, setLocalStatus] = useState('');
  const [legacySessions] = useState(() => loadReadOnlyAIChatHistory(getChatStorage(), labels.untitledChat));
  const legacySession = legacySessions.find(s => s.id === legacyId);
  const enabled = Boolean(cloud.capabilities?.features[cloud.mode]?.enabled);
  const workspace = useAIChatToolWorkspace({language, isLoggedIn: isLoggedIn && cloud.mode === 'assistant' && enabled && !legacySession});
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const activeMessages = legacySession?.messages ?? cloud.messages;
  const preferenceKey = `${INSTRUCTIONS_KEY}.${accountKey}.${cloud.mode}`;
  const instructions = preference.key === preferenceKey ? preference.value : '';
  useEffect(() => {
    const timer = window.setTimeout(() => {try {setPreference({key: preferenceKey, value: localStorage.getItem(preferenceKey) ?? ''});} catch {setPreference({key: preferenceKey, value: ''});}}, 0);
    return () => window.clearTimeout(timer);
  }, [preferenceKey]);
  useLayoutEffect(() => {messageScrollRef.current?.scrollTo({top: messageScrollRef.current.scrollHeight, behavior: 'smooth'});}, [activeMessages, cloud.status, localStatus]);
  function setInstructions(value: string) {setPreference({key: preferenceKey, value}); try {localStorage.setItem(preferenceKey, value);} catch { /* Keep in-memory preference. */ }}
  function clearWorkspace() {workspace.clearTransientWorkspace(); setLegacyId(''); setInput('');}
  function switchMode(mode: 'assistant' | 'chat') {clearWorkspace(); cloud.switchMode(mode);}
  function selectSession(id: string) {clearWorkspace(); cloud.selectSession(id);}
  function startNewSession() {clearWorkspace(); cloud.newSession(); setSidebarOpen(false);}
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const message = input.trim();
    setLocalStatus('');
    if (!message || !enabled || cloud.sendingId || workspace.localToolRunning || legacySession) return;
    const tool = cloud.mode === 'assistant' ? detectDesktopToolIntent(message) : null;
    try {
      if (tool) {
        await cloud.runLocal(message, tool.type === 'join_server' ? 'desktop_join' : 'desktop_latency', async signal => {
          workspace.setLocalToolRunning(true);
          const operation = ++workspace.localToolOperationRef.current;
          if (tool.type === 'join_server') return workspace.handleJoinIntent(tool, signal, cloud.activeId, operation, setLocalStatus);
          const results = tool.type === 'test_latency' ? [await probeServerAddress(tool.address, {signal})] : await workspace.measureActiveCandidates(tool.category, signal);
          if (!signal.aborted) workspace.setLocalToolResults(results);
          return results.map(result => `${result.server.name || result.server.ip} (${result.server.ip}:${result.server.port}): ${result.success ? `${result.latencyMs} ms` : result.error || labels.failed}`).join('\n');
        }, () => setInput(value => value.trim() === message ? '' : value));
      } else {
        await cloud.send(message, instructions.trim(), undefined, () => setInput(value => value.trim() === message ? '' : value));
      }
    } catch (error) {setLocalStatus(error instanceof Error ? error.message : String(error));}
    finally {workspace.setLocalToolRunning(false); setLocalStatus('');}
  }
  async function requestJoin(server: ServerStatus, latencyMs?: number) {
    if (!enabled || cloud.mode !== 'assistant' || legacySession) return;
    await cloud.runLocal(`Join ${server.ip || server.Addr}:${server.port || server.Port}`, 'desktop_join', async signal => {
      signal.throwIfAborted();
      const result = await workspace.requestJoin(server,latencyMs);
      return localToolStatus(language,result === 'joined' ? 'joining' : 'confirmJoin');
    });
  }
  async function runJoinAction(operation: () => Promise<void>, kind: 'once' | 'queue') {
    const server = workspace.joinTarget;
    if (!server || !enabled || cloud.mode !== 'assistant' || legacySession) throw new Error(labels.failed);
    let failure: unknown;
    const accepted = await cloud.runLocal(`Join ${kind} ${server.ip || server.Addr}:${server.port || server.Port}`, 'desktop_join', async signal => {
      signal.throwIfAborted();
      try {await operation();} catch (error) {failure=error;throw error;}
      return kind === 'queue' ? labels.queue : localToolStatus(language,'joining');
    });
    if (failure) throw failure;
    if (!accepted) throw new Error(labels.processing);
  }
  async function stop() {await cloud.stop();}
  const sessions = cloud.sessions.map(s => ({id: s.id, title: s.title, createdAt: Date.parse(s.created_at), updatedAt: Date.parse(s.updated_at), messages: s.id === cloud.activeId ? cloud.messages : []}));
  const activeStatus = localStatus || cloud.error || (cloud.status === 'compacting' ? cloudLabels.compacting : cloud.status === 'compacted' ? cloudLabels.compacted : cloud.sendingId ? cloud.status === 'queue' ? `${labels.queue}${cloud.queuePosition > 0 ? ` #${cloud.queuePosition}` : ''}` : labels.processing : '');
  return {...workspace, cloud, cloudLabels, legacySessions, legacySession, selectLegacy: (id: string) => {workspace.clearTransientWorkspace(); setLegacyId(id);},
    language, labels, isLoggedIn, isReady, input, setInput, instructions, setInstructions, sidebarOpen, setSidebarOpen, messageScrollRef,
    sessionState: {sessions, activeSessionId: cloud.activeId}, activeSession: legacySession ?? sessions.find(s => s.id === cloud.activeId), activeMessages,
    activeTurnCount: countAIChatTurns(activeMessages), activeStatus, activeSessionSending: cloud.sendingId === cloud.activeId || cloud.activeSession?.status === 'running',
    sendingSessionId: cloud.sendingId, enabled: enabled && !legacySession, switchMode, startNewSession, selectSession,
    requestJoin, runJoinAction, deleteSessions: cloud.deleteSessions, setThinkingOpen: cloud.setThinkingOpen, submit, stop};
}
