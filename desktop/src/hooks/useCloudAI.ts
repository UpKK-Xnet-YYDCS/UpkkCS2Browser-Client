"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {aiCloudJSON, aiCloudStream} from "@/services/aiCloud";
import {cloudSessionResumeMs, recentCloudSessions, savedCloudSessions} from "./cloud-session-policy";

export type AIMode = "assistant" | "chat";
export interface CloudMessage {
  id: string; role: "user" | "assistant"; content: string; status?: string; source?: string;
  input_tokens?: number; output_tokens?: number;
  thinking?: string; thinkingOpen?: boolean; pending?: boolean; tokenInput?: number; tokenOutput?: number;
}
export interface CloudSession {
  id: string; mode: AIMode; title: string; revision: number; status: string; created_at: string; updated_at: string;
  messages?: CloudMessage[];
}
export interface CloudCapabilities {features: Record<string, {enabled: boolean}>}

export function useCloudAI(accountKey: string, locale: string) {
  const [mode, setMode] = useState<AIMode>("assistant");
  const [sessions, setSessions] = useState<CloudSession[]>([]);
  const [activeIds, setActiveIds] = useState<Partial<Record<AIMode, string>>>({});
  const [cache, setCache] = useState<Record<string, CloudMessage[]>>({});
  const [cursors, setCursors] = useState<Record<string, number>>({});
  const [capabilities, setCapabilities] = useState<CloudCapabilities>();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const identity = useRef("");
  const [boundAccount, setBoundAccount] = useState(accountKey);
  const accountMatches=boundAccount===accountKey;
  const olderLoaded=useRef(new Set<string>());
  const state = useRef({mode, sessions, activeIds, sendingId});
  useEffect(() => {state.current = {mode, sessions, activeIds, sendingId};}, [mode, sessions, activeIds, sendingId]);
  const visitKey = `xproj.ai-cloud.visit.${accountKey}`;
  const lastVisit = useRef(0);
  const activeId = activeIds[mode] ?? "";
  const activeSession = sessions.find(s => s.id === activeId);
  const messages = useMemo(() => cache[activeId] ?? [], [cache, activeId]);

  const detail = useCallback(async (id: string, before = 0) => {
    const requestEpoch = epoch.current;
    const data = await aiCloudJSON(`/api/ai-chat/sessions/${id}${before ? `?before=${before}` : ""}`);
    if (requestEpoch !== epoch.current) return;
    const session = data.session as unknown as CloudSession;
    const incoming = (session.messages ?? []).map(m => ({...m, pending: m.status === "running", tokenInput:m.input_tokens,tokenOutput:m.output_tokens}));
    setCache(current => {
      const old = current[id] ?? [];
      const ids = new Set(incoming.map(m => m.id));
      return {...current, [id]: before ? [...incoming, ...old.filter(m => !ids.has(m.id))] : [...old.filter(m => !ids.has(m.id)), ...incoming]};
    });
    if(before)olderLoaded.current.add(id);
    setCursors(current => !before&&olderLoaded.current.has(id)?current:({...current, [id]: Number(data.next_before || 0)}));
    setSessions(current => current.map(s => s.id === id ? {...session, messages: undefined} : s));
  }, []);

  const refresh = useCallback(async () => {
    let requestEpoch = epoch.current;
    try {
      const config = await aiCloudJSON("/api/ai-chat/config");
      if (requestEpoch !== epoch.current) return;
      setCapabilities(config as unknown as CloudCapabilities);
      if (!accountKey) {setReady(true); return;}
      const auth = await aiCloudJSON("/api/auth/user");
      const user = auth.user as {id?: number} | undefined;
      const nextIdentity = auth.logged_in ? String(user?.id ?? auth.id ?? "") : "";
      if (requestEpoch !== epoch.current) return;
      const changed = Boolean(identity.current && identity.current !== nextIdentity);
      if (!nextIdentity || changed) {
        epoch.current += 1; requestEpoch = epoch.current;
        controller.current?.abort(); controller.current = null;
        olderLoaded.current.clear(); setCache({}); setSessions([]); setActiveIds({}); setCursors({}); setSendingId(null);
      }
      identity.current = nextIdentity;
      if (!nextIdentity || nextIdentity !== accountKey.split(":").at(-1)) {setReady(true); return;}
      const data = await aiCloudJSON("/api/ai-chat/sessions");
      if (requestEpoch !== epoch.current) return;
      const list = data.sessions as unknown as CloudSession[];
      const current = changed ? {...state.current, activeIds: {}, sessions: []} : state.current;
      const retained = new Set(list.map(session => session.id));
      if (current.sendingId) retained.add(current.sendingId);
      setCache(values => Object.fromEntries(Object.entries(values).filter(([id]) => retained.has(id))));
      setCursors(values => Object.fromEntries(Object.entries(values).filter(([id]) => retained.has(id))));
      olderLoaded.current.forEach(id => {if (!retained.has(id)) olderLoaded.current.delete(id);});
      setSessions(list);
      const id = current.activeIds[current.mode];
      if (id && id !== current.sendingId && list.some(s => s.id === id)) await detail(id);
      else if (id && current.sessions.some(s => s.id === id) && !list.some(s => s.id === id)) {
        setActiveIds(values => ({...values, [current.mode]: crypto.randomUUID()}));
      }
    } catch (reason) {if (requestEpoch === epoch.current) setError(reason instanceof Error ? reason.message : String(reason));}
    finally {if (requestEpoch === epoch.current) setReady(true);}
  }, [accountKey, detail]);

  const saveVisit = useCallback(() => {
    if (!accountKey) return;
    lastVisit.current = Date.now();
    try {localStorage.setItem(visitKey, JSON.stringify({visitedAt: lastVisit.current, activeIds: savedCloudSessions(state.current.activeIds, state.current.sessions)}));} catch { /* Storage is optional. */ }
  }, [accountKey, visitKey]);

  useEffect(() => {
    epoch.current += 1; identity.current = "";
    controller.current?.abort();
    const reset = window.setTimeout(() => {
      let restored = {};
      let nextMode: AIMode = "assistant";
      try {
        restored = recentCloudSessions(localStorage.getItem(visitKey), Date.now());
        nextMode = localStorage.getItem(`xproj.ai-cloud.mode.${accountKey}`) === "chat" ? "chat" : "assistant";
      } catch { /* Start a fresh draft if storage is unavailable. */ }
      const nextIds = {assistant: crypto.randomUUID(), chat: crypto.randomUUID(), ...restored};
      state.current = {mode: nextMode, activeIds: nextIds, sessions: [], sendingId: null};
      setMode(nextMode); setBoundAccount(accountKey); setReady(false);
      olderLoaded.current.clear(); setCache({}); setSessions([]); setActiveIds(nextIds); setCursors({}); setSendingId(null); setError("");
      saveVisit(); void refresh();
    }, 0);
    let polling = false;
    const sync = () => {
      if (document.hidden || polling) return;
      if (lastVisit.current && Date.now() - lastVisit.current >= cloudSessionResumeMs && !controller.current) {
        const nextIds = {assistant: crypto.randomUUID(), chat: crypto.randomUUID()};
        state.current = {...state.current, activeIds: nextIds};
        setActiveIds(nextIds);
      }
      saveVisit(); polling = true;
      void refresh().finally(() => {polling = false;});
    };
    window.addEventListener("pagehide", saveVisit);
    const timer = window.setInterval(sync, 15000);
    window.addEventListener("focus", sync); document.addEventListener("visibilitychange", sync);
    return () => {epoch.current += 1; controller.current?.abort(); window.clearTimeout(reset); window.clearInterval(timer); window.removeEventListener("pagehide", saveVisit); window.removeEventListener("focus", sync); document.removeEventListener("visibilitychange", sync);};
  }, [refresh, accountKey, visitKey, saveVisit]);

  useEffect(() => {
    if (!accountMatches || !ready || !accountKey || document.hidden) return;
    saveVisit();
  }, [activeIds, sessions, accountMatches, ready, accountKey, saveVisit]);

  const selectSession = useCallback((id: string) => {
    const session = state.current.sessions.find(s => s.id === id);
    if (!session) return;
    setMode(session.mode); setActiveIds(current => ({...current, [session.mode]: id}));
    void detail(id).catch(reason => setError(String(reason)));
  }, [detail]);
  const switchMode = useCallback((next: AIMode) => {
    setMode(next);
    try {localStorage.setItem(`xproj.ai-cloud.mode.${accountKey}`, next);} catch { /* Mode remains available in memory. */ }
    const current = state.current;
    const id = current.activeIds[next];
    if (id&&current.sessions.some(session=>session.id===id)) void detail(id).catch(reason => setError(String(reason)));
  }, [detail, accountKey]);
  const newSession = useCallback(() => {setActiveIds(current => ({...current, [state.current.mode]: crypto.randomUUID()})); setError("");}, []);
  const deleteSessions = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await aiCloudJSON("/api/ai-chat/sessions", "DELETE", {ids});
    setCache(current => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.includes(id))));
    setActiveIds(current => Object.fromEntries(Object.entries(current).filter(([, id]) => !ids.includes(id!))));
    await refresh();
  }, [refresh]);
  const send = useCallback(async (message: string, instructions: string, extra?: {context?: string; image?: File}, onAccepted?: () => void) => {
    if (controller.current || !message.trim() || !accountKey) return false;
    const current = state.current;
    const session = current.sessions.find(s => s.id === current.activeIds[current.mode]);
    const id = current.activeIds[current.mode] ?? session?.id ?? crypto.randomUUID();
    const requestId = crypto.randomUUID();
    const abort = new AbortController(); controller.current = abort;
    const requestEpoch = epoch.current;
    setSendingId(id); setQueuePosition(0); setStatus("processing"); setError(""); setActiveIds(ids => ({...ids, [current.mode]: id}));
    let claimed = false;
    try {
      const payload = {mode: current.mode, revision: session?.revision ?? 0, request_id: requestId, message, instructions, context: extra?.context};
      let body: unknown = payload;
      if (extra?.image) {
        const form = new FormData();
        for (const [name, value] of Object.entries(payload)) if (value !== undefined) form.set(name, String(value));
        form.set("image", extra.image);
        body = form;
      }
      await aiCloudStream(`/api/ai-chat/sessions/${id}/messages`, body, abort.signal, event => {
        if (requestEpoch !== epoch.current) return;
        if (event.type === "session") {
          if (!claimed) onAccepted?.();
          claimed = true;
          const incoming = event.session as unknown as CloudSession;
          setSessions(values => [incoming, ...values.filter(s => s.id !== id)].slice(0, 15));
          setCache(values => ({...values, [id]: (incoming.messages ?? []).map(m => ({...m, pending: m.status === "running", tokenInput:m.input_tokens,tokenOutput:m.output_tokens}))}));
        } else if (event.type === "message" || event.type === "thinking") {
          const chunk = String(event.content || "");
          setCache(values => ({...values, [id]: (values[id] ?? []).map(m => m.id === `${requestId}-a`
            ? event.type === "message" ? {...m, content: m.content + chunk, pending: true} : {...m, thinking: (m.thinking ?? "") + chunk, thinkingOpen: true} : m)}));
        } else if (event.type === "usage") {
          setCache(values => ({...values, [id]: (values[id] ?? []).map(m => m.id === `${requestId}-a` ? {...m, tokenInput: Number(event.input_tokens), tokenOutput: Number(event.output_tokens)} : m)}));
        }
        if (event.type === "queue") setQueuePosition(Number(event.position) || 0);
        else if (event.type === "processing") setQueuePosition(0);
        if (event.type !== "heartbeat" && event.type !== "usage") setStatus(String(event.type));
      }, locale);
      return true;
    } catch (reason) {
      if (requestEpoch === epoch.current && !abort.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason));
      return claimed;
    } finally {
      if (controller.current === abort) controller.current = null;
      if (requestEpoch === epoch.current) {
        setSendingId(null); setStatus("");
        setCache(values => ({...values, [id]: (values[id] ?? []).map(m => ({...m, pending: false}))}));
        if (claimed) await detail(id).catch(() => undefined);
        await refresh();
      }
    }
  }, [accountKey, detail, locale, refresh]);
  const runLocal = useCallback(async (message: string, kind: "desktop_join" | "desktop_latency", operation: (signal: AbortSignal) => Promise<string>, onAccepted?: () => void) => {
    if (controller.current || !accountKey || state.current.mode !== "assistant") return false;
    const current = state.current;
    const id = current.activeIds.assistant ?? crypto.randomUUID();
    const session = current.sessions.find(s => s.id === id);
    const requestId = crypto.randomUUID();
    const abort = new AbortController(); controller.current = abort;
    const requestEpoch = epoch.current;
    setSendingId(id); setQueuePosition(0); setStatus("processing"); setError("");
    let claimed = false; let result = ""; let interrupted = false;
    try {
      const response = await aiCloudJSON(`/api/ai-chat/sessions/${id}/local-turn`, "POST", {
        mode: "assistant", revision: session?.revision ?? 0, request_id: requestId, message, local_kind: kind,
      }, abort.signal);
      if (requestEpoch !== epoch.current) return false;
      if (response.replay) return true;
      claimed = true;
      onAccepted?.();
      setActiveIds(ids => ({...ids, assistant: id}));
      const incoming = response.session as unknown as CloudSession;
      setSessions(values => [incoming, ...values.filter(s => s.id !== id)].slice(0, 15));
      setCache(values => ({...values, [id]: (incoming.messages ?? []).map(m => ({...m, pending: m.status === "running", tokenInput:m.input_tokens,tokenOutput:m.output_tokens}))}));
      result = await operation(abort.signal);
      return true;
    } catch (reason) {
      interrupted = true;
      result = reason instanceof Error ? reason.message : String(reason);
      if (!abort.signal.aborted && requestEpoch === epoch.current) setError(result);
      return claimed;
    } finally {
      if (claimed) {
        try {await aiCloudJSON(`/api/ai-chat/sessions/${id}/local-result`, "POST", {request_id: requestId, result, interrupted});}
        catch (reason) {if (requestEpoch === epoch.current) setError(String(reason));}
      }
      if (controller.current === abort) controller.current = null;
      if (requestEpoch === epoch.current) {setSendingId(null); setStatus(""); if (claimed) await detail(id).catch(() => undefined); await refresh();}
    }
  }, [accountKey, detail, refresh]);
  const stop = useCallback(async () => {
    const id = state.current.sendingId ?? activeId;
    if (id) await aiCloudJSON(`/api/ai-chat/sessions/${id}/stop`, "POST", {});
    controller.current?.abort();
    await refresh();
  }, [activeId, refresh]);
  const loadOlder = () => activeId && cursors[activeId] ? detail(activeId, cursors[activeId]) : Promise.resolve();
  function setThinkingOpen(id: string, open: boolean) {setCache(values => ({...values, [activeId]: (values[activeId] ?? []).map(m => m.id === id ? {...m, thinkingOpen: open} : m)}));}
  return {mode, switchMode, sessions:accountMatches?sessions:[], activeId, activeSession:accountMatches?activeSession:undefined, messages:accountMatches?messages:[], ready:accountMatches&&ready, capabilities, sendingId, status, queuePosition, error,
    send, runLocal, stop, refresh, selectSession, newSession, deleteSessions, loadOlder, hasOlder: Boolean(cursors[activeId]), setThinkingOpen};
}
