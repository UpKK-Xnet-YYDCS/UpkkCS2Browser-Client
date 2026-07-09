/**
 * In-App Toast Notification System
 * 
 * Telegram-style bottom-right corner notifications with sound effects.
 * Used by the monitor service to show map alerts when system notifications are unavailable.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { dismissToast, useToasts, type ToastMessage } from '@/services/toast';

// ============== Toast Item Component ==============

function ToastItem({ toast }: { toast: ToastMessage }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismiss = useCallback(() => dismissToast(toast.id), [toast.id]);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      timerRef.current = setTimeout(() => {
        setExiting(true);
        setTimeout(dismiss, 300);
      }, toast.duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss, toast.duration]);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(dismiss, 300);
  }, [dismiss]);

  const bgColor = toast.type === 'success' ? 'bg-green-600'
    : toast.type === 'warning' ? 'bg-amber-600'
    : toast.type === 'error' ? 'bg-red-600'
    : 'bg-blue-600';

  const icon = toast.type === 'success' ? '✅'
    : toast.type === 'warning' ? '⚠️'
    : toast.type === 'error' ? '❌'
    : '🎮';

  return (
    <div
      className={`max-w-sm w-full shadow-2xl rounded-xl overflow-hidden transition-all duration-300 ${
        exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className={`${bgColor} px-4 py-2 flex items-center gap-2`}>
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold text-white truncate flex-1">{toast.title}</span>
        <button
          onClick={handleDismiss}
          className="text-white/70 hover:text-white transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 px-4 py-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{toast.body}</p>
      </div>
    </div>
  );
}

// ============== Toast Container Component ==============

/**
 * Renders toast notifications in the bottom-right corner.
 * Mount this once at the app root level.
 */
export function ToastContainer() {
  const toasts = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
