import {useState} from 'react';
import { MessageSquare, Plus, Trash2, X } from '@/components/lucideIcons';
import type { AIChatSession } from '@/services/aiChatSessions';
import type { Language } from '@/store/i18n';
import type { AIChatLabels } from '@/i18n/aiChat';

interface AIChatSessionSidebarProps {
  sessions: AIChatSession[];
  activeSessionId: string;
  language: Language;
  labels: AIChatLabels;
  open: boolean;
  sendingSessionId: string | null;
  newDisabled?: boolean;
  runningSessionIds: string[];
  onNew(): void;
  onSelect(sessionId: string): void;
  onDeleteMany(sessionIds: string[]): Promise<void>;
  cloudLabels: {selectAll: string; select: string; deleteSelected: string; confirmDelete: string; retention: string};
  onClose(): void;
}

export function AIChatSessionSidebar({
  sessions,
  activeSessionId,
  language,
  labels,
  open,
  sendingSessionId,
  runningSessionIds,
  onNew,
  newDisabled,
  onSelect,
  onDeleteMany,
  cloudLabels,
  onClose,
}: AIChatSessionSidebarProps) {
 const busy = (id: string) => id === sendingSessionId || runningSessionIds.includes(id);
 const [selected,setSelected]=useState<string[]>([]);
 async function remove(ids:string[]){if(!ids.length||!window.confirm(cloudLabels.confirmDelete.replace("{count}",String(ids.length))))return;try{await onDeleteMany(ids);setSelected([]);}catch(error){window.alert(String(error));}}
  return (
    <>
      {open && (
        <button
          type="button"
          className="absolute inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-label={labels.closeSidebar}
        />
      )}
      <aside className={`absolute inset-y-0 left-0 z-40 flex w-[min(280px,86vw)] flex-col border-r border-gray-200 bg-gray-100 transition-transform dark:border-gray-700 dark:bg-gray-900 lg:static lg:z-auto lg:w-64 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-3 dark:border-gray-700">
          <button
            type="button"
            onClick={onNew}
            disabled={newDisabled}
            className="flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">{labels.newChat}</span>
          </button>
          <button type="button" onClick={onClose} title={labels.closeSidebar} aria-label={labels.closeSidebar} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-2 py-3">
          <h2 className="mb-2 px-2 text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">{labels.conversations}</h2>
          <p className="mb-2 px-2 text-[10px] text-gray-500">{cloudLabels.retention}</p>
          <label className="mb-2 flex items-center gap-2 px-2 text-xs"><input type="checkbox" aria-label={cloudLabels.selectAll} checked={sessions.length>0&&sessions.filter(s=>!busy(s.id)).every(s=>selected.includes(s.id))} onChange={e=>setSelected(e.target.checked?sessions.filter(s=>!busy(s.id)).map(s=>s.id):[])}/>{cloudLabels.selectAll}</label>
          <button className="mb-2 text-xs text-red-600 disabled:opacity-40" disabled={!selected.length} type="button" onClick={()=>void remove(selected)}>{cloudLabels.deleteSelected} ({selected.length})</button>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {sessions.map(session => {
              const active = session.id === activeSessionId;
              return (
                <div key={session.id} className={`group flex min-w-0 items-center rounded-md ${active ? 'bg-white shadow-sm dark:bg-gray-800' : 'hover:bg-gray-200/70 dark:hover:bg-gray-800/70'}`}>
                  <input type="checkbox" aria-label={`${cloudLabels.select} ${session.title}`} disabled={busy(session.id)} checked={selected.includes(session.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,session.id]:ids.filter(id=>id!==session.id))}/>
                  <button type="button" onClick={() => onSelect(session.id)} className="flex min-w-0 flex-1 items-start gap-2.5 px-2.5 py-2.5 text-left">
                    <MessageSquare className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs font-medium text-gray-800 dark:text-gray-100">{session.title || labels.untitledChat}</strong>
                      <span className="mt-0.5 block truncate text-[10px] tabular-nums text-gray-500 dark:text-gray-400">{formatSessionTime(session.updatedAt, language)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove([session.id])}
                    disabled={busy(session.id)}
                    title={labels.deleteConversation}
                    aria-label={labels.deleteConversation}
                    className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded text-gray-400 opacity-100 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-20 focus:opacity-100 dark:hover:bg-red-950/40 lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}

function formatSessionTime(timestamp: number, language: Language): string {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat(language, sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric' }).format(date);
}
