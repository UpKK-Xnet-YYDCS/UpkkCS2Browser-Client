import React, { useState, useEffect, useRef } from 'react';
import type { Translations } from '../store/i18n';

type SteamClient = 'steam' | 'steamchina';

// 获取当前 Steam 协议
export const getSteamProtocol = (): string => {
  const client = localStorage.getItem('steamClient') as SteamClient || 'steam';
  return client === 'steamchina' ? 'steamchina' : 'steam';
};

// CS2/CSGO AppIDs
const CS_APP_IDS = [730, 740];
// CS2/CSGO game names (pre-lowercased for comparison)
const CS_GAME_NAMES_LOWER = ['counter-strike 2', 'counter-strike: global offensive'];

/**
 * Check if a server is a CS2/CSGO server based on appid and game name.
 * Returns true if CS, false if non-CS, or null if unknown (no info provided).
 */
export const isCSGame = (gameId?: number, gameName?: string): boolean | null => {
  if (gameId && gameId > 0) {
    return CS_APP_IDS.includes(gameId);
  }
  if (gameName) {
    return CS_GAME_NAMES_LOWER.includes(gameName.toLowerCase());
  }
  return null; // Unknown — no info provided
};

/**
 * 构建完整的加入游戏 URL
 * If the server is a non-CS game (appid not 730/740 and game name not CS2/CSGO),
 * use steam://connect/address:port for better game compatibility.
 * If no game info is available or server is CS, use the CS launch method.
 */
export const buildJoinUrl = (address: string, port: number | string, gameId?: number, gameName?: string): string => {
  const protocol = getSteamProtocol();
  const csCheck = isCSGame(gameId, gameName);
  // Non-CS game: use generic steam://connect/ for better compatibility
  if (csCheck === false) {
    return `${protocol}://connect/${address}:${port}`;
  }
  // CS game or unknown (default to CS launch method)
  return `${protocol}://rungame/730/76561202255233023/+connect ${address}:${port}`;
};

// Get current steam client from localStorage
export const getSteamClient = (): SteamClient => {
  const saved = localStorage.getItem('steamClient') as SteamClient;
  return (saved === 'steam' || saved === 'steamchina') ? saved : 'steam';
};

// Set steam client in localStorage
export const setSteamClient = (client: SteamClient) => {
  localStorage.setItem('steamClient', client);
};

interface SteamClientSwitchProps {
  t: Translations;
}

const SteamClientSwitch: React.FC<SteamClientSwitchProps> = ({ t }) => {
  const [client, setClient] = useState<SteamClient>(getSteamClient);
  const [notification, setNotification] = useState<{ show: boolean; type: SteamClient } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingClient, setPendingClient] = useState<SteamClient | null>(null);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setClient(getSteamClient());
  }, []);

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
      if (e.key === 'steamClient') {
        const val = e.newValue as SteamClient;
        if (val === 'steam' || val === 'steamchina') setClient(val);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleToggle = () => {
    const newClient: SteamClient = client === 'steam' ? 'steamchina' : 'steam';
    setPendingClient(newClient);
    setShowConfirmDialog(true);
  };

  const confirmSwitch = () => {
    if (pendingClient) {
      setClient(pendingClient);
      setSteamClient(pendingClient);
      
      // Dispatch storage event so Settings stays in sync
      window.dispatchEvent(new StorageEvent('storage', { key: 'steamClient', newValue: pendingClient }));
      
      setNotification({ show: true, type: pendingClient });
      
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      
      notificationTimeoutRef.current = setTimeout(() => {
        setNotification(null);
      }, 3000);
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
      {/* Confirm dialog */}
      {showConfirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="steam-switch-dialog-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
          }}
          onClick={cancelSwitch}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="steam-switch-dialog-title" style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
              {t.steamSwitchConfirmTitle}
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#666', lineHeight: '1.5' }}>
              {pendingClient === 'steamchina' ? (
                <>
                  {t.steamSwitchToChina}
                  <br />
                  <span style={{ fontSize: '13px', color: '#999' }}>
                    {t.steamSwitchToChinaWarning}
                  </span>
                </>
              ) : (
                t.steamSwitchToInternational
              )}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelSwitch}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e0e0e0'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
                onFocus={(e) => { e.currentTarget.style.outline = '2px solid #1a73e8'; }}
                onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
              >
                {t.steamCancel}
              </button>
              <button
                onClick={confirmSwitch}
                style={{
                  padding: '10px 20px',
                  backgroundColor: pendingClient === 'steamchina' ? '#e65100' : '#1a73e8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
                onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
                onFocus={(e) => { e.currentTarget.style.outline = '2px solid white'; e.currentTarget.style.outlineOffset = '2px'; }}
                onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
              >
                {t.steamConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification banner */}
      {notification?.show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            padding: '12px 20px',
            backgroundColor: notification.type === 'steam' ? '#4caf50' : '#ff9800',
            color: 'white',
            textAlign: 'center',
            zIndex: 10000,
            fontWeight: 'bold',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          {notification.type === 'steam'
            ? t.steamSwitchedToInternational
            : t.steamSwitchedToChina}
        </div>
      )}
      
      {/* Toggle button */}
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
