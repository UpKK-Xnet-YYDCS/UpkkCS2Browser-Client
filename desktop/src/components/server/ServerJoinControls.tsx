import type { ServerStatus } from '@/types';
import { useI18n } from '@/hooks/useI18n';
import { useMultiServerDropdown } from '@/hooks/useMultiServerDropdown';
import { useServerJoinActions } from '@/hooks/useServerJoinActions';
import { MultiServerDropdownPanel } from '../MultiServerDropdownPanel';
import { ServerActionModals } from '../ServerActionModals';
import { Icons } from '../serverCardPresentation';

export type ServerJoinControlsVariant = 'card' | 'list';

interface ServerJoinControlsProps {
  server: ServerStatus;
  variant: ServerJoinControlsVariant;
  serverIp: string;
  serverPort: string | number;
  serverCountry: string;
  serverCountryCode: string;
  serverPlayers: number;
  serverMaxPlayers: number;
  dropdown: ReturnType<typeof useMultiServerDropdown>;
  join: ReturnType<typeof useServerJoinActions>;
}

export function ServerJoinControls({
  server,
  variant,
  serverIp,
  serverPort,
  serverCountry,
  serverCountryCode,
  serverPlayers,
  serverMaxPlayers,
  dropdown,
  join,
}: ServerJoinControlsProps) {
  const { t } = useI18n();
  const isCard = variant === 'card';
  const {
    open: showMultiServerDropdown,
    panelRef: multiServerRef,
    buttonRef: multiServerBtnRef,
    position: dropdownPos,
    toggle: handleMultiServerClick,
  } = dropdown;
  const {
    showAutoJoinModal,
    showLatencyProbeModal,
    autoJoinTarget,
    joinTarget,
    closeAutoJoin,
    closeLatency,
    closeJoin,
    alternates,
    hasAlternates,
    handleConnect,
    handleAutoJoin,
    handleAutoJoinFromDropdown,
    handleAutoJoinAlternate,
    handleConnectAlternate,
  } = join;

  return (
    <>
      <button
        onClick={handleAutoJoin}
        className={isCard
          ? 'inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg'
          : 'p-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white transition-all duration-200'}
        title={t.autoJoinButton}
        aria-label={t.autoJoinButton}
      >
        <Icons.AutoJoin />
      </button>
      {hasAlternates && (
        <>
          <button
            ref={multiServerBtnRef}
            onClick={handleMultiServerClick}
            className={isCard
              ? 'inline-flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg'
              : 'flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-medium rounded-lg transition-all duration-200'}
            title={t.multiServerSelect}
          >
            {t.multiServerSelect}({(alternates?.length ?? 0) + 1})
          </button>
          <MultiServerDropdownPanel
            open={showMultiServerDropdown}
            position={dropdownPos}
            placement={isCard ? 'up' : 'down'}
            panelRef={multiServerRef}
            serverIp={serverIp}
            serverPort={serverPort}
            serverCountry={serverCountry}
            serverCountryCode={serverCountryCode}
            serverPlayers={serverPlayers}
            serverMaxPlayers={serverMaxPlayers}
            alternates={alternates}
            onAutoJoinPrimary={handleAutoJoinFromDropdown}
            onJoinPrimary={handleConnect}
            onAutoJoinAlternate={handleAutoJoinAlternate}
            onJoinAlternate={handleConnectAlternate}
          />
        </>
      )}
      <button
        onClick={handleConnect}
        className={isCard
          ? 'inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg'
          : 'flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-medium rounded-lg transition-colors'}
      >
        <Icons.Play />
        {isCard ? t.joinServer : t.join}
      </button>
      <ServerActionModals
        server={server}
        showAutoJoinModal={showAutoJoinModal}
        showLatencyProbeModal={showLatencyProbeModal}
        autoJoinTarget={autoJoinTarget}
        joinTarget={joinTarget}
        onCloseAutoJoin={closeAutoJoin}
        onCloseLatency={closeLatency}
        onCloseJoin={closeJoin}
      />
    </>
  );
}
