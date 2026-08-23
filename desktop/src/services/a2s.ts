/**
 * A2S Query Utility
 *
 * Shared helper for querying game servers using the A2S (Steam Server Query) protocol.
 * Uses the Tauri backend command query_server_a2s for local UDP queries.
 */

export {
  isTauriAvailable,
  queryServerA2S,
  queryServersA2S,
} from './a2sQuery.ts';
export type {
  A2SQueryResult,
  QueryServerA2SOptions,
  A2SQueryTarget,
  QueryServersA2SOptions,
} from './a2sQuery.ts';
export {
  createDesktopA2SLatencyScheduler,
} from './a2sLatencyDesktop.ts';
export type {
  DesktopA2SLatencySchedulerOptions,
} from './a2sLatencyDesktop.ts';
export {
  createLocalLatencyScheduler,
} from './a2sLatency.ts';
export type {
  LocalLatencySnapshot,
  LocalLatencyStatus,
  LocalLatencyTarget,
} from './a2sLatency.ts';
export { parseServerAddress } from './a2sAddress.ts';
