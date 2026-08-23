import type { SteamClient } from '@/services/steamClient';

interface SteamClientNoticeProps {
  type: SteamClient;
  internationalLabel: string;
  chinaLabel: string;
}

export function SteamClientNotice({ type, internationalLabel, chinaLabel }: SteamClientNoticeProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 20px',
        backgroundColor: type === 'steam' ? '#4caf50' : '#ff9800',
        color: 'white',
        textAlign: 'center',
        zIndex: 10000,
        fontWeight: 'bold',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      }}
    >
      {type === 'steam' ? internationalLabel : chinaLabel}
    </div>
  );
}
