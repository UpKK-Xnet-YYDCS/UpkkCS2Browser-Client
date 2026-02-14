/**
 * A2S Query Utility
 * 
 * Shared helper for querying game servers using the A2S (Steam Server Query) protocol.
 * Uses the Tauri backend command `query_server_a2s` for local UDP queries.
 */

import { invoke } from '@tauri-apps/api/core';

// A2S query result from Tauri backend
export interface A2SQueryResult {
  success: boolean;
  error?: string;
  ip: string;
  port: string;
  name: string;
  map_name: string;
  game: string;
  players: number;
  max_players: number;
  bots: number;
  real_players: number;
  server_type: string;
  environment: string;
  password: boolean;
  vac: boolean;
  version: string;
}

/**
 * Check if the Tauri runtime environment is available
 */
export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Check if a string is a valid IPv4 address.
 */
function isIPv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    const num = Number(part);
    if (isNaN(num) || num < 0 || num > 255 || part !== String(num)) return false;
  }
  return true;
}

/**
 * Check if a string looks like a valid domain name.
 */
function isDomainName(host: string): boolean {
  if (!host || host.length > 253) return false;
  // Basic domain name validation: alphanumeric, hyphens, dots
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(host);
}

/**
 * Parse an address string like "1.2.3.4:27015" or "example.com:27015" into { host, port }.
 * Accepts both IPv4 addresses and domain names.
 * Returns null if invalid.
 */
export function parseServerAddress(address: string): { ip: string; port: string } | null {
  const trimmed = address.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;
  const host = parts[0].trim();
  const port = parts[1].trim();
  if (!host || !port) return null;
  // Validate port is a number in valid range
  const portNum = Number(port);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) return null;
  // Accept both IPv4 and domain names
  if (!isIPv4(host) && !isDomainName(host)) return null;
  return { ip: host, port };
}

/**
 * Resolve a domain name to an IP address via Tauri backend.
 * Returns the original host if it's already an IPv4 address or resolution fails.
 */
export async function resolveHost(host: string): Promise<string> {
  if (isIPv4(host)) return host;
  if (!isTauriAvailable()) return host;
  try {
    const resolved = await invoke<string>('resolve_hostname', { hostname: host });
    return resolved || host;
  } catch {
    // Tauri command may not exist — fall back to original host
    // The A2S backend may handle domain resolution internally
    return host;
  }
}

function emptyA2SResult(ip: string, port: string, error: string): A2SQueryResult {
  return { success: false, error, ip, port, name: '', map_name: '', game: '', players: 0, max_players: 0, bots: 0, real_players: 0, server_type: '', environment: '', password: false, vac: false, version: '' };
}

/**
 * Query a game server using the local A2S protocol via Tauri backend.
 * Resolves domain names to IP addresses before querying.
 * Returns the result with success/error status — no silent fallback.
 * All errors are surfaced in the result's error field.
 */
export async function queryServerA2S(ip: string, port: string): Promise<A2SQueryResult> {
  if (!isTauriAvailable()) {
    return emptyA2SResult(ip, port, 'Tauri runtime not available — A2S query requires the desktop app');
  }

  try {
    // Resolve domain name to IP if needed
    const resolvedIp = await resolveHost(ip);
    const result = await invoke<A2SQueryResult>('query_server_a2s', { ip: resolvedIp, port });
    return result;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[A2S] Query failed:', errMsg);
    return emptyA2SResult(ip, port, errMsg);
  }
}
