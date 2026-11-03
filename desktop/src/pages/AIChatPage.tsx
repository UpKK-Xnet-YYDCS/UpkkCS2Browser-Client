import { lazy, Suspense } from 'react';
import { Bot, Menu, RotateCcw, Send, Settings2, Square } from '@/components/lucideIcons';
import { AIChatSessionSidebar } from '@/components/AIChatSessionSidebar';
import { CloudLoginPanel } from '@/components/CloudLoginPanel';
import { AIMessageList } from '@/components/AIMessageList';
import { AILocalTools } from '@/components/AILocalTools';
import { useAIChatPage } from '@/hooks/useAIChatPage';
import {useCloudAuth} from '@/hooks/useCloudAuth';
import {getApiBaseUrl} from '@/api/client';
import {openServerSummary} from '@/services/serverSummary';


const JoinServerConfirmModal = lazy(() => import('@/components/JoinServerConfirmModal').then(module => ({ default: module.JoinServerConfirmModal })));
const JoinServerPickerModal = lazy(() => import('@/components/JoinServerPickerModal').then(module => ({ default: module.JoinServerPickerModal })));

export function AIChatPage() {
  const {authStatus} = useCloudAuth();
  return <AIChatWorkspace key={`${getApiBaseUrl()}:${authStatus.logged_in ? authStatus.user?.id : 0}`}/>;
}

function AIChatWorkspace() {
  const page = useAIChatPage();
  const {
    language, labels, isLoggedIn, isReady, sessionState, input, setInput, instructions, setInstructions,
    sendingSessionId, sidebarOpen, setSidebarOpen, joinTarget, setJoinTarget, joinCandidates, setJoinCandidates,
    joinLatency, localToolResults, setLocalToolResults, localToolRunning, messageScrollRef, activeSession, activeMessages,
    activeTurnCount, activeStatus, activeSessionSending, startNewSession, selectSession, deleteSessions,
    requestJoin, setThinkingOpen, submit, stop,
  } = page;
 const {cloud,cloudLabels,legacySessions,legacySession}=page;
 const summaryButton = <button type="button" onClick={() => void openServerSummary(language).catch(error => alert(error))} className="rounded px-3 py-1 text-sm bg-emerald-600 text-white">{labels.prompts[0]} ↗</button>;

  if (!isReady) return <div className="grid min-h-0 flex-1 place-items-center overflow-hidden text-sm text-gray-500">{labels.loading}</div>;
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">{summaryButton}<CloudLoginPanel
        icon={<Bot className="h-9 w-9" aria-hidden="true" />}
        title={labels.loginTitle}
        description={labels.loginBody}
      /></div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-white dark:bg-gray-950">
      <AIChatSessionSidebar key={cloud.mode}
        newDisabled={!page.enabled||Boolean(sendingSessionId)}
        sessions={sessionState.sessions.filter(s=>cloud.sessions.find(item=>item.id===s.id)?.mode===cloud.mode)}
        activeSessionId={sessionState.activeSessionId}
        language={language}
        labels={labels}
        open={sidebarOpen}
        sendingSessionId={sendingSessionId}
        runningSessionIds={cloud.sessions.filter(session => session.status === 'running').map(session => session.id)}
        onNew={startNewSession}
        onSelect={selectSession}
        onDeleteMany={deleteSessions}
        cloudLabels={cloudLabels}
        onClose={() => setSidebarOpen(false)}
      />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-gray-950">
        <div className="flex flex-wrap items-center gap-2 border-b p-2 dark:border-gray-800" role="group" aria-label={cloudLabels.mode}>
          {(['assistant','chat'] as const).map(mode=><button type="button" key={mode} aria-pressed={cloud.mode===mode&&!legacySession} className={`rounded px-3 py-1 text-sm ${cloud.mode===mode&&!legacySession?'bg-emerald-600 text-white':'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`} onClick={()=>page.switchMode(mode)}>{cloudLabels[mode]}</button>)}
          <span className="text-xs text-gray-500">{cloud.sessions.length}/15</span>
          {summaryButton}
          {legacySessions.length>0&&<details className="relative"><summary className="cursor-pointer text-xs text-gray-500">{cloudLabels.legacy}</summary><div className="absolute z-30 max-h-64 w-64 overflow-auto rounded border bg-white p-2 shadow dark:bg-gray-900">{legacySessions.map(s=><button className="block w-full truncate p-2 text-left text-xs" key={s.id} type="button" onClick={()=>page.selectLegacy(s.id)}>{s.title}</button>)}</div></details>}
        </div>
        {((!page.enabled&&cloud.ready)||legacySession)&&<p className="px-4 py-2 text-xs text-amber-700 dark:text-amber-300">{legacySession?cloudLabels.legacy:cloudLabels.disabled}</p>}
        {cloud.hasOlder&&!legacySession&&<button className="p-2 text-xs text-emerald-600" type="button" onClick={()=>void cloud.loadOlder()}>{cloudLabels.loadOlder}</button>}
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
          labels={cloud.mode === 'chat' ? {...labels, welcome: cloudLabels.chat} : labels}
          desktopResultLabel={cloudLabels.desktopResult}
          interruptedLabel={cloudLabels.interrupted}
          status={activeStatus}
          scrollRef={messageScrollRef}
          prompts={cloud.mode==='assistant'?labels.prompts:[]}
          promptDisabled={Boolean(sendingSessionId)}
          onPrompt={setInput}
          setThinkingOpen={setThinkingOpen}
        />

        <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-950 sm:px-5">
          <div className="mx-auto w-full max-w-[820px]">
            {cloud.mode==='assistant'&&!legacySession&&<AILocalTools
              language={language}
              running={localToolRunning && activeSessionSending}
              results={localToolResults}
              onJoin={requestJoin}
              onClear={() => setLocalToolResults([])}
            />}
            <form onSubmit={event => void submit(event)} className="mt-2 flex min-h-12 items-end gap-2 rounded-lg border border-gray-300 bg-gray-50 p-1.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900">
              <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={cloud.mode === 'chat' ? cloudLabels.chatPlaceholder : labels.placeholder} disabled={!page.enabled || Boolean(sendingSessionId) && !activeSessionSending} maxLength={4000} rows={1} className="max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-gray-900 outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-white" />
              {activeSessionSending ? (
                <button type="button" onClick={stop} title={labels.stop} aria-label={labels.stop} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-red-600 text-white hover:bg-red-700"><Square className="h-3.5 w-3.5 fill-current" /></button>
              ) : (
                <button type="submit" disabled={!page.enabled || !input.trim() || Boolean(sendingSessionId) || localToolRunning} title={labels.send} aria-label={labels.send} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"><Send className="h-4 w-4" /></button>
              )}
            </form>
          </div>
        </div>
      </section>

      {cloud.mode==='assistant'&&page.enabled&&joinTarget && (
        <Suspense fallback={null}>
          <JoinServerConfirmModal server={joinTarget} latencyMs={joinLatency} runAction={page.runJoinAction} onClose={() => setJoinTarget(null)} />
        </Suspense>
      )}
      {cloud.mode==='assistant'&&page.enabled&&joinCandidates.length > 0 && (
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
