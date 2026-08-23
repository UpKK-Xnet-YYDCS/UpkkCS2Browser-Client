import { createPortal } from 'react-dom';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import type { AlternateServer } from '@/types';
import { useI18n } from '@/hooks/useI18n';
import type { MultiServerDropdownPlacement } from '@/services/multiServerDropdown';
import { Icons } from './serverCardPresentation';

interface MultiServerDropdownPanelProps {
  open: boolean;
  position: { top: number; left: number } | null;
  placement: MultiServerDropdownPlacement;
  panelRef: RefObject<HTMLDivElement | null>;
  serverIp: string;
  serverPort: string | number;
  serverCountry: string;
  serverCountryCode: string;
  serverPlayers: number;
  serverMaxPlayers: number;
  alternates?: AlternateServer[];
  onAutoJoinPrimary: (event: ReactMouseEvent) => void;
  onJoinPrimary: (event: ReactMouseEvent) => void;
  onAutoJoinAlternate: (ip: string, port: string, event: ReactMouseEvent) => void;
  onJoinAlternate: (ip: string, port: string, event: ReactMouseEvent) => void;
}

export function MultiServerDropdownPanel({
  open,
  position,
  placement,
  panelRef,
  serverIp,
  serverPort,
  serverCountry,
  serverCountryCode,
  serverPlayers,
  serverMaxPlayers,
  alternates,
  onAutoJoinPrimary,
  onJoinPrimary,
  onAutoJoinAlternate,
  onJoinAlternate,
}: MultiServerDropdownPanelProps) {
  const { t } = useI18n();
  if (!open || !position) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        transform: placement === 'up' ? 'translateY(-100%)' : undefined,
      }}
    >
      <div className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold">
        {t.multiServerTitle}
      </div>
      <div className="max-h-[200px] overflow-y-auto">
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex-1 min-w-0">
            <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{serverIp}:{serverPort}</span>
            <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
              {serverCountryCode && <span>{serverCountry || serverCountryCode}</span>}
              <span>{serverPlayers}/{serverMaxPlayers}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onAutoJoinPrimary}
              className="p-1 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded transition-colors"
              title={t.autoJoinButton}
            >
              <Icons.AutoJoin />
            </button>
            <button
              onClick={onJoinPrimary}
              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded transition-colors"
            >
              {t.multiServerJoin}
            </button>
          </div>
        </div>
        {alternates?.map((alt) => (
          <div key={alt.ip + ':' + alt.port} className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{alt.ip}:{alt.port}</span>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                {alt.country_code && <span>{alt.country_name || alt.country_code}</span>}
                <span>{alt.real_players}/{alt.max_players}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(event) => onAutoJoinAlternate(alt.ip, alt.port, event)}
                className="p-1 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded transition-colors"
                title={t.autoJoinButton}
              >
                <Icons.AutoJoin />
              </button>
              <button
                onClick={(event) => onJoinAlternate(alt.ip, alt.port, event)}
                className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold rounded transition-colors"
              >
                {t.multiServerJoin}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
