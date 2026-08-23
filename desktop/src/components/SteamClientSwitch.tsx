import React, { useState, useEffect, useRef } from 'react';
import type { Translations } from '../store/i18n';
import {
  STEAM_CLIENT_NOTICE_MS,
  dispatchSteamClientStorageEvent,
  getSteamClient,
  readSteamClientFromStorageEvent,
  setSteamClient,
  toggleSteamClient,
  type SteamClient,
} from '@/services/steamClient';
import { SteamClientConfirmDialog } from '@/components/steam/SteamClientConfirmDialog';
import { SteamClientNotice } from '@/components/steam/SteamClientNotice';

interface SteamClientSwitchProps {
  t: Translations;
}

const SteamClientSwitch: React.FC<SteamClientSwitchProps> = ({ t }) => {
  const [client, setClient] = useState<SteamClient>(getSteamClient);
  const [notification, setNotification] = useState<{ show: boolean; type: SteamClient } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingClient, setPendingClient] = useState<SteamClient | null>(null);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  // Listen for external changes to steamClient (e.g. from Settings)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const next = readSteamClientFromStorageEvent(e.key, e.newValue);
      if (next) setClient(next);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleToggle = () => {
    setPendingClient(toggleSteamClient(client));
    setShowConfirmDialog(true);
  };

  const confirmSwitch = () => {
    if (pendingClient) {
      setClient(pendingClient);
      setSteamClient(pendingClient);
      
      // Dispatch storage event so Settings stays in sync
      dispatchSteamClientStorageEvent(pendingClient);
      
      setNotification({ show: true, type: pendingClient });
      
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      
      notificationTimeoutRef.current = setTimeout(() => {
        setNotification(null);
      }, STEAM_CLIENT_NOTICE_MS);
    }
    setShowConfirmDialog(false);
    setPendingClient(null);
  };

  const cancelSwitch = () => {
    setShowConfirmDialog(false);
    setPendingClient(null);
  };

  return (
    <>
      {showConfirmDialog && pendingClient && (
        <SteamClientConfirmDialog
          pendingClient={pendingClient}
          title={t.steamSwitchConfirmTitle}
          toChina={t.steamSwitchToChina}
          toChinaWarning={t.steamSwitchToChinaWarning}
          toInternational={t.steamSwitchToInternational}
          cancelLabel={t.steamCancel}
          confirmLabel={t.steamConfirm}
          onCancel={cancelSwitch}
          onConfirm={confirmSwitch}
        />
      )}

      {notification?.show && (
        <SteamClientNotice
          type={notification.type}
          internationalLabel={t.steamSwitchedToInternational}
          chinaLabel={t.steamSwitchedToChina}
        />
      )}
      
      <button
        onClick={handleToggle}
        title={client === 'steam' ? t.steamHeaderTooltipInternational : t.steamHeaderTooltipChina}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: client === 'steam' ? '#1a73e8' : '#e65100',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: '16px' }}>
          {client === 'steam' ? '🌐' : '🇨🇳'}
        </span>
        <span>
          {client === 'steam' ? t.steamInternational : t.steamChina}
        </span>
      </button>
    </>
  );
};

export default SteamClientSwitch;
