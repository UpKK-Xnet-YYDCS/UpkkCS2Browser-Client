import { createPortal } from 'react-dom';
import { Server, X } from 'lucide-react';
import type { ServerStatus } from '@/types';
import { useI18n } from '@/hooks/useI18n';

interface JoinServerPickerModalProps {
  candidates: ServerStatus[];
  onSelect: (server: ServerStatus) => void;
  onClose: () => void;
}

const labels = {
  en: { title: 'Choose a server', cancel: 'Cancel' },
  ja: { title: 'サーバーを選択', cancel: 'キャンセル' },
  'zh-CN': { title: '请选择要加入的服务器', cancel: '取消' },
  'zh-TW': { title: '請選擇要加入的伺服器', cancel: '取消' },
  ko: { title: '접속할 서버 선택', cancel: '취소' },
} as const;

export function JoinServerPickerModal({ candidates, onSelect, onClose }: JoinServerPickerModalProps) {
  const { language } = useI18n();
  const text = labels[language];
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <section className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="join-picker-title">
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 id="join-picker-title" className="text-lg font-bold text-gray-900 dark:text-white">{text.title}</h2>
          <button type="button" onClick={onClose} title={text.cancel} aria-label={text.cancel} className="grid h-9 w-9 place-items-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-4 w-4" /></button>
        </header>
        <div className="max-h-80 divide-y divide-gray-200 overflow-auto p-2 dark:divide-gray-700">
          {candidates.map(server => {
            const address = `${server.ip || server.Addr}:${server.port || server.Port}`;
            return (
              <button key={address} type="button" onClick={() => onSelect(server)} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-950/30">
                <Server className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-gray-900 dark:text-white">{server.name || server.Name || address}</strong><span className="block font-mono text-xs text-gray-500">{address}</span></span>
                <span className="shrink-0 text-xs tabular-nums text-gray-500">{server.real_players ?? server.players ?? 0}/{server.max_players ?? server.MaxPlayers ?? '?'}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>,
    document.body,
  );
}
