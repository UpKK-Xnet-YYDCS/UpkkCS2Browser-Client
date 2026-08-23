import { useState } from 'react';
import { addFavorite } from '@/api/favorites';
import { refreshServer } from '@/api/servers';
import { CountdownProgressBar } from '@/components/CountdownProgressBar';
import { useI18n } from '@/hooks/useI18n';
import { favoriteAddDisplayName, favoriteAddFailureMessage, parseFavoriteAddressInput } from '@/services/favoriteAddressInput';

// Star filled icon
const StarFilledIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

// Refresh icon
const RefreshIcon = ({ spinning = false }) => (
  <svg className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Logout icon
const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

// Search icon
const SearchIcon = () => (
  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// Plus icon
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// Add Favorite Modal
function AddFavoriteModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { t } = useI18n();
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const parsed = parseFavoriteAddressInput(address);
    if (!parsed) return;

    setIsSubmitting(true);
    setError('');
    try {
      const result = await addFavorite(parsed.ip, parsed.port, favoriteAddDisplayName(name, parsed.raw), notes.trim());
      if (result.success) {
        // Trigger A2S query to immediately populate server info
        refreshServer(`${parsed.ip}:${parsed.port}`).catch(() => {});
        onAdded();
        onClose();
      } else {
        setError(favoriteAddFailureMessage(result));
      }
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
            <h2 className="text-lg font-bold">{t.addFavoriteTitle}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-green-100 text-sm mt-1">{t.addFavoriteDesc}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.serverAddress}</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="192.168.1.1:27015"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 outline-none transition-all"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.serverNameOptional}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.serverNameOptional}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.notesOptional}</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t.notesOptional}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:ring-4 focus:ring-green-500/20 outline-none transition-all"
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
              {isSubmitting ? '...' : t.addToFavorites}
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

export {
  AddFavoriteModal,
  CountdownProgressBar,
  LogoutIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  StarFilledIcon,
};
