/**
 * Local A2S query helpers.
 *
 * Shared helper for querying game servers using the A2S (Steam Server Query) protocol.
 * Uses the Tauri backend command query_server_a2s for local UDP queries.
 */

import type { A2SQueryResult, A2SQueryTarget } from '@/types/desktop';
import { invokeDesktop } from './desktopRuntime.ts';

export type { A2SQueryResult, A2SQueryTarget } from '@/types/desktop';

export interface QueryServerA2SOptions {
  timeoutMs?: number;
}

export interface QueryServersA2SOptions extends QueryServerA2SOptions {
  concurrency?: number;
}

export function buildA2SInvokeArgs(
  ip: string,
  port: string,
  options: QueryServerA2SOptions = {},
): { ip: string; port: string; timeoutMs?: number } {
  const args: { ip: string; port: string; timeoutMs?: number } = { ip, port };
  if (typeof options.timeoutMs === 'number') args.timeoutMs = options.timeoutMs;
  return args;
}

/**
 * Check if the Tauri runtime environment is available
 */
export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function emptyA2SResult(ip: string, port: string, error: string): A2SQueryResult {
  return { success: false, error, ip, port, name: '', map_name: '', game: '', players: 0, max_players: 0, bots: 0, real_players: 0, server_type: '', environment: '', password: false, vac: false, version: '' };
}

/**
 * Query a game server using the local A2S protocol via Tauri backend.
 * Domain names are resolved by Rust's UDP socket connection.
 * Returns the result with success/error status - no silent fallback.
 * All errors are surfaced in the result's error field.
 */
export async function queryServerA2S(ip: string, port: string, options: QueryServerA2SOptions = {}): Promise<A2SQueryResult> {
  if (!isTauriAvailable()) {
    return emptyA2SResult(ip, port, 'Tauri runtime not available — A2S query requires the desktop app');
  }

  try {
    const result = await invokeDesktop('query_server_a2s', buildA2SInvokeArgs(ip, port, options));
    return result;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[A2S] Query failed:', errMsg);
    return emptyA2SResult(ip, port, errMsg);
  }
}

/** Query multiple servers through one IPC call while preserving input order. */
export async function queryServersA2S(
  targets: A2SQueryTarget[],
  options: QueryServersA2SOptions = {},
): Promise<A2SQueryResult[]> {
  const normalizedTargets = targets.map(target => ({
    ip: target.ip,
    port: target.port,
    timeoutMs: target.timeoutMs ?? options.timeoutMs,
  }));
  if (normalizedTargets.length === 0) return [];
  if (!isTauriAvailable()) {
    return normalizedTargets.map(target => emptyA2SResult(
      target.ip,
      target.port,
      'Tauri runtime not available — A2S query requires the desktop app',
    ));
  }

  try {
    return await invokeDesktop('query_servers_a2s', {
      targets: normalizedTargets,
      concurrency: options.concurrency,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[A2S] Batch query failed:', message);
    return normalizedTargets.map(target => emptyA2SResult(target.ip, target.port, message));
  }
}
