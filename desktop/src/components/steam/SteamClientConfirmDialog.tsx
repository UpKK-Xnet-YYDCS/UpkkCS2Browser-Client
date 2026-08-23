import type { SteamClient } from '@/services/steamClient';

interface SteamClientConfirmDialogProps {
  pendingClient: SteamClient;
  title: string;
  toChina: string;
  toChinaWarning: string;
  toInternational: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SteamClientConfirmDialog({
  pendingClient,
  title,
  toChina,
  toChinaWarning,
  toInternational,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: SteamClientConfirmDialogProps) {
  return (
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
      onClick={onCancel}
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
          {title}
        </h3>
        <p style={{ margin: '0 0 20px 0', color: '#666', lineHeight: '1.5' }}>
          {pendingClient === 'steamchina' ? (
            <>
              {toChina}
              <br />
              <span style={{ fontSize: '13px', color: '#999' }}>
                {toChinaWarning}
              </span>
            </>
          ) : (
            toInternational
          )}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
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
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
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
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
