import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock3, Play, X } from 'lucide-react';
import type { ServerStatus } from '@/types';
import { useI18n } from '@/hooks/useI18n';
import { openServerOnce } from '@/services/steamClient';
import { AutoJoinModal } from './AutoJoinModal';

interface JoinServerConfirmModalProps {
  server: ServerStatus;
  latencyMs?: number;
  onClose: () => void;
}

const labels = {
  en: { title: 'Join %s?', once: 'Join once', queue: 'Auto queue', cancel: 'Cancel', players: 'Players', latency: 'Local RTT' },
  ja: { title: '%s に接続しますか？', once: '1回接続', queue: '自動待機', cancel: 'キャンセル', players: 'プレイヤー', latency: 'ローカルRTT' },
  'zh-CN': { title: '要加入 %s 服务器吗？', once: '单次加入', queue: '自动排队加入', cancel: '取消', players: '玩家', latency: '本地延迟' },
  'zh-TW': { title: '要加入 %s 伺服器嗎？', once: '單次加入', queue: '自動排隊加入', cancel: '取消', players: '玩家', latency: '本機延遲' },
  ko: { title: '%s 서버에 접속할까요?', once: '한 번 접속', queue: '자동 대기열', cancel: '취소', players: '플레이어', latency: '로컬 RTT' },
} as const;

export function JoinServerConfirmModal({ server, latencyMs, onClose }: JoinServerConfirmModalProps) {
  const { language } = useI18n();
  const text = labels[language];
  const [autoQueue, setAutoQueue] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  if (autoQueue) return <AutoJoinModal server={server} onClose={onClose} autoStart />;

  const name = String(server.name || server.Name || `${server.ip || server.Addr}:${server.port || server.Port}`);
  const address = `${server.ip || server.Addr}:${server.port || server.Port}`;
  const players = Number(server.real_players ?? server.players ?? server.Players ?? 0);
  const maxPlayers = Number(server.max_players ?? server.MaxPlayers ?? 0);

  const joinOnce = async () => {
    setJoining(true);
    setError('');
    try {
      await openServerOnce(server);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setJoining(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <section className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="join-server-title">
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <h2 id="join-server-title" className="break-words text-base font-bold text-gray-900 dark:text-white sm:text-lg">{text.title.replace('%s', name)}</h2>
            <p className="mt-0.5 font-mono text-xs text-gray-500 dark:text-gray-400">{address}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title={text.cancel} aria-label={text.cancel}>
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-3 rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-900/60">
            <div><span className="block text-xs text-gray-500">{text.players}</span><strong className="text-gray-900 dark:text-white">{players}/{maxPlayers || '?'}</strong></div>
            <div><span className="block text-xs text-gray-500">{text.latency}</span><strong className="text-gray-900 dark:text-white">{latencyMs ?? server.local_latency_ms ?? '?'} ms</strong></div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <footer className="grid gap-2 border-t border-gray-200 p-4 sm:grid-cols-3 dark:border-gray-700">
          <button type="button" onClick={() => void joinOnce()} disabled={joining} className="flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <Play className="h-4 w-4" />{text.once}
          </button>
          <button type="button" onClick={() => setAutoQueue(true)} disabled={joining} className="flex items-center justify-center gap-2 rounded-md bg-cyan-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
            <Clock3 className="h-4 w-4" />{text.queue}
          </button>
          <button type="button" onClick={onClose} disabled={joining} className="rounded-md bg-gray-100 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
            {text.cancel}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
