import type { ServerStatus } from '@/types';

export interface ServerTimeLabels {
  secondsAgo: string;
  minutesAgo: string;
  hoursAgo: string;
  minuteUnit: string;
  hourUnit: string;
  dayUnit: string;
}

export function isServerOffline(server: ServerStatus): boolean {
  const explicitOffline = firstBoolean(server.server_offline, server.offline);
  if (explicitOffline === true) return true;

  const explicitOnline = firstBoolean(server.online, server.is_online, server.Online);
  if (explicitOnline !== undefined) return !explicitOnline;
  if (explicitOffline === false) return false;

  const success = booleanValue(server.success);
  if (success !== undefined) return !success;

  const thresholdMinutes = numericValue(server.offline_threshold_minutes, 20);
  if (isOlderThanMinutes(getLastResponseTimestamp(server), thresholdMinutes)) return true;

  return false;
}

export function isServerOnline(server: ServerStatus): boolean {
  return !isServerOffline(server);
}

export function getLastResponseTimestamp(server: ServerStatus): string {
  return firstValidDate(
    server.last_seen,
    server.last_updated,
    server.updated_at,
    server.LastUpdate,
  );
}

export function getServerRelativeTime(server: ServerStatus, labels: ServerTimeLabels): string {
  return firstNonEmpty(
    translateRelativeMarker(server.last_seen_relative, labels),
    translateRelativeMarker(server.last_updated_relative, labels),
    translateRelativeMarker(server.updated_at_relative, labels),
    translateRelativeMarker(extractDataReturnRelative(server.comments), labels),
  );
}

export function getOfflineDuration(server: ServerStatus, labels: ServerTimeLabels): string {
  return formatElapsedDuration(getLastResponseTimestamp(server), labels) || getServerRelativeTime(server, labels);
}

export function formatServerDate(value: string, locale?: string): string {
  const date = parseServerDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatElapsedDuration(value: string, labels: ServerTimeLabels): string {
  const date = parseServerDate(value);
  if (!date) return '';

  const totalMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60_000));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}${labels.dayUnit}`);
  if (hours > 0) parts.push(`${hours}${labels.hourUnit}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes || totalMinutes}${labels.minuteUnit}`);

  return parts.join(' ');
}

function isOlderThanMinutes(value: string, minutes: number): boolean {
  if (!value || minutes <= 0) return false;
  const date = parseServerDate(value);
  if (!date) return false;
  return Date.now() - date.getTime() > minutes * 60_000;
}

function firstValidDate(...values: Array<string | undefined>): string {
  return values.find((value) => Boolean(parseServerDate(value)))?.trim() ?? '';
}

function parseServerDate(value: string | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)
    ? trimmed.replace(' ', 'T')
    : trimmed;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime()) || date.getFullYear() <= 1970) return null;
  return date;
}

function firstBoolean(...values: unknown[]): boolean | undefined {
  for (const value of values) {
    const parsed = booleanValue(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  return undefined;
}

function numericValue(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function translateRelativeMarker(value: string | undefined, labels: ServerTimeLabels): string {
  if (!value) return '';
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)\s+\[TIME_UNIT_(SECONDS|MINUTES|HOURS)\]$/);
  if (!match) return trimmed;

  const amount = Number.parseInt(match[1] ?? '0', 10);
  const unit = match[2];
  if (unit === 'SECONDS') return `${amount} ${labels.secondsAgo}`;
  if (unit === 'MINUTES') return `${amount} ${labels.minutesAgo}`;
  return `${amount} ${labels.hoursAgo}`;
}

function extractDataReturnRelative(comments: string | undefined): string {
  const marker = '[DATA_RETURN_TIME]:';
  const index = comments?.indexOf(marker) ?? -1;
  if (!comments || index < 0) return '';
  return comments.slice(index + marker.length).trim();
}

function firstNonEmpty(...values: string[]): string {
  return values.find((value) => Boolean(value.trim()))?.trim() ?? '';
}
