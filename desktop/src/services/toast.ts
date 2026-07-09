import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  title: string;
  body: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  createdAt: number;
}

export type NotificationSound = 'chime' | 'bubble' | 'bell' | 'none';

const SOUND_STORAGE_KEY = 'notificationSound';
const SOUND_ENABLED_KEY = 'notificationSoundEnabled';

export function isNotificationSoundEnabled(): boolean {
  const saved = localStorage.getItem(SOUND_ENABLED_KEY);
  return saved !== 'false';
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

export function getNotificationSound(): NotificationSound {
  const saved = localStorage.getItem(SOUND_STORAGE_KEY) as NotificationSound | null;
  if (saved === 'chime' || saved === 'bubble' || saved === 'bell' || saved === 'none') return saved;
  return 'bubble';
}

export function setNotificationSound(sound: NotificationSound): void {
  localStorage.setItem(SOUND_STORAGE_KEY, sound);
}

export function playNotificationSound(sound?: NotificationSound): void {
  if (!isNotificationSoundEnabled()) return;
  const type = sound || getNotificationSound();
  if (type === 'none') return;

  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    if (type === 'chime') {
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
      playTone(523.25, 0, 0.3);
      playTone(659.25, 0.15, 0.4);
    } else if (type === 'bubble') {
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
      playHarmonic(830, 0.2, 0.8);
      playHarmonic(1660, 0.08, 0.4);
      playHarmonic(2490, 0.03, 0.2);
    }
  } catch {
    // Audio is optional; unsupported environments simply skip the sound.
  }
}

type ToastListener = (toasts: ToastMessage[]) => void;

let globalToasts: ToastMessage[] = [];
const listeners = new Set<ToastListener>();

function notifyListeners() {
  listeners.forEach(fn => fn([...globalToasts]));
}

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
  playNotificationSound();
}

export function dismissToast(id: string): void {
  globalToasts = globalToasts.filter(t => t.id !== id);
  notifyListeners();
}

export function useToasts(): ToastMessage[] {
  const [toasts, setToasts] = useState<ToastMessage[]>(globalToasts);

  useEffect(() => {
    const listener: ToastListener = (updated) => setToasts(updated);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  return toasts;
}
