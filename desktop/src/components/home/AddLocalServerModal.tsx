import { useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { parseServerAddress, queryServerA2S } from '@/services/a2s';

const DEFAULT_LOCAL_SERVER_PORT = '27015';

interface AddLocalServerModalProps {
  onClose: () => void;
  onAdded: (addr: string) => void;
}

export function AddLocalServerModal({ onClose, onAdded }: AddLocalServerModalProps) {
  const { t } = useI18n();
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = address.trim();
    if (!trimmed) return;

    const parsed = parseServerAddress(trimmed.includes(':') ? trimmed : `${trimmed}:${DEFAULT_LOCAL_SERVER_PORT}`);
    if (!parsed) {
      setError(t.invalidAddressFormat);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Query A2S to validate the server is reachable
      const result = await queryServerA2S(parsed.ip, parsed.port);
      if (!result.success) {
        setError(result.error || 'Failed to query server');
        return;
      }

      const addr = `${parsed.ip}:${parsed.port}`;
      onAdded(addr);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t.addLocalServer}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-green-100 text-sm mt-1">{t.addLocalServerDesc}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.serverAddress}</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="192.168.1.1:27015 / example.com:27015"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 outline-none transition-all"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!address.trim() || isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {isSubmitting ? '...' : t.addLocalServer}
            </button>
            <button onClick={onClose} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium rounded-xl transition-colors">
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
