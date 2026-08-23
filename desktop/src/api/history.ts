import { buildQuery, fetchWithRetry } from './client';

export interface PlayerHistoryStat {
  timestamp: string;
  real_players: number;
  bots: number;
  players?: number;
}

export interface PlayerHistoryResponse {
  ip: string;
  port: string;
  period: string;
  stats: PlayerHistoryStat[];
}

// Get server player history for chart
export const getServerPlayerHistory = async (
  serverId: string,
  period: string = '24h'
): Promise<PlayerHistoryResponse> => {
  return fetchWithRetry(`/api/server/${serverId}/stats?period=${period}`);
};


export interface MapHistoryItem {
  map_name: string;
  timestamp: string; // API returns "timestamp" field, e.g. "2026-01-31T12:51:56.231+08:00"
  started_at?: string; // Alternative field name
  ended_at?: string;
  duration_seconds?: number;
}

// MapSessionRecord represents a map session with duration and player count history
export interface MapSessionRecord {
  start_time: string;
  end_time: string;
  map_name: string;
  duration_secs: number;
  avg_players: number;
  max_players: number;
  min_players: number;
  player_history: number[]; // Player count samples for mini chart
  bot_history: number[];    // Bot count samples for mini chart
}

export interface MapHistoryResponse {
  server_id: string;
  history: MapHistoryItem[];
  sessions?: MapSessionRecord[]; // Enhanced session data with player history
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// Get server map history
// API format: /api/server/地址:端口/maphistory?page=1&per_page=30
export const getServerMapHistory = async (
  serverAddress: string, // e.g. "cs2ze.upkk.com:27015"
  page: number = 1,
  perPage: number = 30
): Promise<MapHistoryResponse> => {
  const query = buildQuery({ page, per_page: perPage });
  return fetchWithRetry(`/api/server/${serverAddress}/maphistory${query}`);
};

// ============== A2S Debug / Query Records API ==============

export interface A2SQueryDebugRecord {
  timestamp: number;
  query_time: string;
  node_name: string;
  is_from_node: boolean;
  success: boolean;
  duration_ms: number;
  a2s_data: Record<string, unknown>;
  error_message: string;
}

export interface A2SLatencyStatPoint {
  timestamp: number;
  avg_latency: number;
  max_latency: number;
  min_latency: number;
  query_count: number;
  success_count: number;
  node_name: string;
}

export interface A2SDebugResponse {
  success: boolean;
  ip: string;
  port: string;
  name?: string;
  records: A2SQueryDebugRecord[];
  stats: A2SLatencyStatPoint[];
  error?: string;
}

// Get A2S query debug records and latency stats for a server
export const getA2SDebug = async (serverAddress: string): Promise<A2SDebugResponse> => {
  return fetchWithRetry(`/api/server/${serverAddress}/a2s-debug`);
};
