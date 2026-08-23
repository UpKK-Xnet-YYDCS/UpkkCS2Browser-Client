import type { MapHistoryItem } from '@/api/history';

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  ja: 'ja-JP',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  ko: 'ko-KR',
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

export function resolveMapHistoryLocale(language: string): string {
  return LOCALE_MAP[language] || 'en-US';
}

export function formatDuration(seconds: number, t: { minutesUnit: string; hoursUnit: string }): string {
  if (seconds < 60) return String(seconds) + 's';
  if (seconds < 3600) return String(Math.floor(seconds / 60)) + ' ' + t.minutesUnit;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return String(hours) + ' ' + t.hoursUnit + (mins > 0 ? ' ' + String(mins) + ' ' + t.minutesUnit : '');
}

export function parseMapHistoryDate(timestamp: string): Date | null {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  if (!isNaN(date.getTime())) return date;

  const unixTimestamp = parseInt(timestamp, 10);
  if (!isNaN(unixTimestamp)) {
    const unixDate = new Date(unixTimestamp * 1000);
    if (!isNaN(unixDate.getTime())) return unixDate;
  }
  return null;
}

export function formatTime(timestamp: string, language: string): string {
  const date = parseMapHistoryDate(timestamp);
  if (!date) return '';
  return date.toLocaleString(resolveMapHistoryLocale(language), TIME_FORMAT);
}

export function getTimestamp(item: Pick<MapHistoryItem, 'timestamp' | 'started_at'>): string {
  return item.timestamp || item.started_at || '';
}
