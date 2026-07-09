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
  if (server.server_offline === true) return true;
  if (server.online === false) return true;
  if (server.Online === false) return true;

  const hasExplicitStatus =
    server.server_offline !== undefined ||
    server.online !== undefined ||
    server.Online !== undefined;
  if (hasExplicitStatus) return false;

  const maxPlayers = server.max_players ?? server.MaxPlayers ?? 0;
  return !(Boolean(server.game || server.GameDesc) || maxPlayers > 0);
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
