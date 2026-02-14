/**
 * In-App Toast Notification System
 * 
 * Telegram-style bottom-right corner notifications with sound effects.
 * Used by the monitor service to show map alerts when system notifications are unavailable.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============== Types ==============

export interface ToastMessage {
  id: string;
  title: string;
  body: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // ms, default 6000
  createdAt: number;
}

export type NotificationSound = 'chime' | 'bubble' | 'bell' | 'none';

// ============== Notification Sound ==============

const SOUND_STORAGE_KEY = 'notificationSound';
const SOUND_ENABLED_KEY = 'notificationSoundEnabled';

/**
 * Get whether notification sound is enabled (default: true)
 */
export function isNotificationSoundEnabled(): boolean {
  const saved = localStorage.getItem(SOUND_ENABLED_KEY);
  return saved !== 'false';
}

/**
 * Set notification sound enabled/disabled
 */
export function setNotificationSoundEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

/**
 * Get current notification sound type (default: 'chime')
 */
export function getNotificationSound(): NotificationSound {
  const saved = localStorage.getItem(SOUND_STORAGE_KEY) as NotificationSound | null;
  if (saved === 'chime' || saved === 'bubble' || saved === 'bell' || saved === 'none') return saved;
  return 'bubble';
}

/**
 * Set notification sound type
 */
export function setNotificationSound(sound: NotificationSound): void {
  localStorage.setItem(SOUND_STORAGE_KEY, sound);
}

/**
 * Play a notification sound using Web Audio API.
 * Generates pleasant synthesized tones without external audio files.
 */
export function playNotificationSound(sound?: NotificationSound): void {
  if (!isNotificationSoundEnabled()) return;
  const type = sound || getNotificationSound();
  if (type === 'none') return;

  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    if (type === 'chime') {
      // Gentle two-tone chime (C5 → E5)
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      playTone(523.25, 0, 0.3);    // C5
      playTone(659.25, 0.15, 0.4); // E5
    } else if (type === 'bubble') {
      // Soft bubble pop sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'bell') {
      // Gentle bell with harmonics
      const playHarmonic = (freq: number, vol: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur);
      };
      playHarmonic(830, 0.2, 0.8);   // fundamental
      playHarmonic(1660, 0.08, 0.4);  // 2nd harmonic
      playHarmonic(2490, 0.03, 0.2);  // 3rd harmonic
    }
  } catch {
    // Audio not available
  }
}

// ============== Global Toast State ==============

type ToastListener = (toasts: ToastMessage[]) => void;

let globalToasts: ToastMessage[] = [];
const listeners = new Set<ToastListener>();

function notifyListeners() {
  listeners.forEach(fn => fn([...globalToasts]));
}

/**
 * Show a toast notification in the bottom-right corner of the app.
 */
export function showToast(title: string, body: string, type: ToastMessage['type'] = 'info', duration = 6000): void {
  const toast: ToastMessage = {
    id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    body,
    type,
    duration,
    createdAt: Date.now(),
  };
  globalToasts = [...globalToasts, toast];
  notifyListeners();

  // Play notification sound
  playNotificationSound();
}

function dismissToast(id: string): void {
  globalToasts = globalToasts.filter(t => t.id !== id);
  notifyListeners();
}

// ============== Hook ==============

function useToasts(): ToastMessage[] {
  const [toasts, setToasts] = useState<ToastMessage[]>(globalToasts);

  useEffect(() => {
    const listener: ToastListener = (updated) => setToasts(updated);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  return toasts;
}

// ============== Toast Item Component ==============

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      timerRef.current = setTimeout(() => {
        setExiting(true);
        setTimeout(onDismiss, 300);
      }, toast.duration);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.duration]);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

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
          <ToastItem
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
